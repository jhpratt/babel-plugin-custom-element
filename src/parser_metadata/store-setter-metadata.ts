import * as Babel from '@babel/core';
import {
    ClassDeclaration,
    Identifier,
    JSXAttribute,
    JSXNamespacedName,
    JSXElement,
    MemberExpression,
    Expression,
    JSXOpeningElement,
    JSXExpressionContainer,
} from '@babel/types';
import { PropertyType } from '../classes/SetterMetadata';
import { Key } from '../state_key';
import { State } from '..';

interface Visitor {
    [key: string]: (
        path: Babel.NodePath,
        {
            t,
            state,
            ref_node,
            attribute_name,
            expr,
            property_type,
        }: {
            t: typeof Babel.types;
            state: State;
            ref_node?: JSXElement | JSXExpressionContainer;
            attribute_name?: string | null; // null if not an attribute
            expr?: Expression;
            property_type: PropertyType;
        },
    ) => void;
}

/**
 * Prepend `#refs = []` to the class body
 *
 * @param t Babel type helper
 * @param klass The class to add `#refs = []` to
 */
export function add_private_refs_member_to_body(
    { t }: { t: typeof Babel.types },
    klass: ClassDeclaration,
): void {
    klass.body.body.unshift(
        t.classPrivateProperty(
            t.privateName(t.identifier('refs')),
            t.arrayExpression(),
        ),
    );
}

/**
 * Visit every `ThisExpression`, storing relevant data in the `state` object.
 */
const attr_visitor: Visitor = {
    MemberExpression(
        { node },
        { t, state, ref_node, attribute_name, expr, property_type },
    ) {
        // Properties must be statically knowable and a `ThisExpression`.
        if (
            (node as MemberExpression).computed
            || !t.isThisExpression((node as MemberExpression).object)
            || !t.isIdentifier((node as MemberExpression).property)
        ) {
            // TODO We should be able to get basic computed members.
            return;
        }

        // None of these should ever happen.
        if (
            ref_node === undefined
            || attribute_name === undefined
            || expr === undefined
        ) {
            throw new Error(
                'Unexpected state. '
                + 'Please file an issue on the GitHub repository.',
            );
        }

        // Mark the element as needing a reference.
        // This is used when converting the JSX to DOM methods.
        state[Key.needs_ref].add(ref_node);

        // Add the data to our global state.
        const setter_metadata = state[Key.setter_metadata];
        setter_metadata.add({
            jsx_attr_name: attribute_name,
            class_prop_name: ((node as MemberExpression).property as Identifier)
                .name,
            ref_number: state[Key.needs_ref].size - 1,
            type: property_type,
            expr,
        });
    },
};

/**
 * Visit all JSX elements, calling `attr_visitor` on all attributes
 * with a `JSXExpressionContainer` value.
 */
const ref_visitor: Visitor = {
    JSXElement(full_path, { t, state }) {
        const path = full_path.get('openingElement') as
            Babel.NodePath<JSXOpeningElement>;

        // Automatic numerical references
        (path
            .get('attributes')
            .filter(
                ({ node }) =>
                    t.isJSXAttribute(node)
                    && t.isJSXExpressionContainer(node.value)
                    && t.isJSXNamespacedName(node.name)
                    && ['attr', 'prop', 'bool'].includes(
                        node.name.namespace.name.toLowerCase(),
                    ),
            ) as Babel.NodePath<JSXAttribute>[]).forEach(attr => {
            const attribute_value_node = attr.node.value;
            if (!t.isJSXExpressionContainer(attribute_value_node)) {
                return;
            }

            const namespace = (attr.node.name as JSXNamespacedName).namespace
                .name;

            let property_type: PropertyType;
            if (namespace === 'attr') {
                property_type = PropertyType.Attribute;
            } else if (namespace === 'prop') {
                property_type = PropertyType.Property;
            } else if (namespace === 'bool') {
                property_type = PropertyType.BooleanAttribute;
            } else {
                throw new Error(
                    'Unexpected state. '
                        + 'Please file an issue on the GitHub repository.',
                );
            }

            attr.traverse(attr_visitor, {
                t,
                state,
                ref_node: full_path.node,
                attribute_name: (attr.node.name as JSXNamespacedName).name.name,
                expr: attribute_value_node.expression,
                property_type,
            });
        });
    },

    JSXExpressionContainer(path, { t, state }) {
        // Skip over attributes that are part of an attribute.
        if (t.isJSXAttribute(path.parent)) {
            return;
        }

        path.traverse(attr_visitor, {
            t,
            state,
            ref_node: path.node,
            attribute_name: null,
            expr: (path.node as JSXExpressionContainer).expression,
            property_type: PropertyType.DynamicTextNode,
        });
    },
};

/**
 * Store a mapping from the class property name to all relevant data:
 *   - The name of the JSX property to set
 *   - The reference number of the the JSX element
 *   - The type of the JSX property (attribute, boolean attribute, property)
 *   - The full expression used to calculate the value of the JSX property
 *
 * @param t Babel type helper
 * @param state Class-wide `State` object
 * @param class_path Path to the class declaration
 */
export function store_refs(
    { t }: { t: typeof Babel.types },
    state: State,
    class_path: Babel.NodePath<ClassDeclaration>,
): void {
    state[Key.needs_ref] = new Set();
    class_path.traverse(ref_visitor, { t, state });
}
