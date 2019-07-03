import * as Babel from '@babel/core';
import {
    JSXAttribute,
    JSXSpreadAttribute,
    Identifier,
    Statement,
    StringLiteral,
    JSXNamespacedName,
    JSXExpressionContainer,
    MemberExpression,
    ClassDeclaration,
} from '@babel/types';
import { State } from '../..';

/**
 * Prepend a private field to the class body
 *
 * @param t Babel type helper
 * @param klass The class to add private field to
 */
export function add_private_field_to_body(
    { t }: { t: typeof Babel.types },
    klass: ClassDeclaration,
    name: string,
): void {
    klass.body.body.unshift(
        t.classPrivateProperty(
            t.privateName(t.identifier(name)),
        ),
    );
}

function build_dynamic_attribute(
    { t, template }: { t: typeof Babel.types; template: typeof Babel.template },
    _state: State,
    attribute: JSXAttribute,
    ident: Identifier | MemberExpression,
    klass: ClassDeclaration,
): Statement {
    const namespace = (attribute.name as JSXNamespacedName)
        .namespace
        .name
        .toLowerCase();
    const property = t.stringLiteral(
        (attribute.name as JSXNamespacedName).name.name,
    );
    const raw_value = attribute.value;

    let value: StringLiteral | JSXExpressionContainer['expression'];
    if (t.isStringLiteral(raw_value)) {
        value = raw_value;
    } else if (t.isJSXExpressionContainer(raw_value)) {
        value = raw_value.expression;
    } else {
        throw new Error(
            'Unexpected state. Please file an issue on the GitHub repository.',
        );
    }

    if (namespace === 'attr') {
        return template.statement.ast`
            ${ident}.setAttribute(${property}, ${value});
        `;
    } else if (namespace === 'prop') {
        return template.statement.ast`
            ${ident}[${property}] = ${value};
        `;
    } else if (namespace === 'bool') {
        return template.statement.ast`
            if (${value}) {
                ${ident}.setAttribute(${property}, '');
            }
        `;
    } else if (namespace === 'on') {
        return template.statement.ast`
            ${ident}.addEventListener(${property}, ${value});
        `;
    } else if (namespace === 'ref' && property.value === 'named') {
        if (!t.isStringLiteral(value)) {
            throw new Error('Named references must be a string.');
        }

        add_private_field_to_body({ t }, klass, value.value);

        const private_named_ref = t.privateName(t.identifier(value.value));
        return template.statement.ast`
            this.${private_named_ref} = ${ident};
        `;
    }
    throw new Error(
        'Unexpected state. Please file an issue on the GitHub repository.',
    );
}

function build_attribute(
    { t, template }: { t: typeof Babel.types; template: typeof Babel.template },
    state: State,
    attribute: JSXAttribute | JSXSpreadAttribute,
    ident: Identifier | MemberExpression,
    klass: ClassDeclaration,
): Statement | undefined {
    if (t.isJSXSpreadAttribute(attribute)) {
        return template.statement.ast`
            Object.assign(this, ${attribute.argument});
        `;
    }

    let name: StringLiteral;
    if (
        t.isJSXNamespacedName(attribute.name)
        && (['bool', 'attr', 'prop', 'on'].includes(
            attribute.name.namespace.name.toLowerCase(),
        ) || (attribute.name.namespace.name.toLowerCase() === 'ref'
            && attribute.name.name.name.toLowerCase() === 'named'))
    ) {
        return build_dynamic_attribute(
            { t, template },
            state,
            attribute,
            ident,
            klass,
        );
    } else if (t.isJSXNamespacedName(attribute.name)) {
        if (attribute.name.namespace.name.toLowerCase() === 'static') {
            return;
        }

        name = t.stringLiteral(
            `${attribute.name.namespace.name}:${attribute.name.name.name}`,
        );
    } else {
        name = t.stringLiteral(attribute.name.name);
    }

    const raw_value = attribute.value;

    let value: StringLiteral | JSXExpressionContainer['expression'];
    if (t.isStringLiteral(raw_value)) {
        value = raw_value;
    } else if (t.isJSXExpressionContainer(raw_value)) {
        value = raw_value.expression;
    } else {
        throw new Error(
            'Unexpected state. Please file an issue on the GitHub repository.',
        );
    }

    return template.statement.ast`
        ${ident}.setAttribute(${name}, ${value});
    `;
}

export function build_attributes(
    { t, template }: { t: typeof Babel.types; template: typeof Babel.template },
    state: State,
    attributes: (JSXAttribute | JSXSpreadAttribute)[],
    ident: Identifier | MemberExpression,
    klass: ClassDeclaration,
): Statement[] {
    return attributes
        .map(attr =>
            build_attribute({ t, template }, state, attr, ident, klass),
        )
        .filter(statements => statements !== undefined) as Statement[];
}
