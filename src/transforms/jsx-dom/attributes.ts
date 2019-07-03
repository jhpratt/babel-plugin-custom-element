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
} from '@babel/types';
import { State } from '../..';
import { Key } from '../../state_key';

function build_dynamic_attribute(
    { t, template }: { t: typeof Babel.types; template: typeof Babel.template },
    state: State,
    attribute: JSXAttribute,
    ident: Identifier | MemberExpression,
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

        state[Key.needs_named_ref] = true;
        const private_named_refs = t.privateName(t.identifier('named_refs'));
        return template.statement.ast`
            this.${private_named_refs}[${value}] = ${ident};
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
): Statement[] {
    return attributes
        .map(attr => build_attribute({ t, template }, state, attr, ident))
        .filter(statements => statements !== undefined) as Statement[];
}
