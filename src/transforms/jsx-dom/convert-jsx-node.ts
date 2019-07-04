import * as Babel from '@babel/core';
import {
    JSXIdentifier,
    Identifier,
    JSXMemberExpression,
    MemberExpression,
    JSXNamespacedName,
} from '@babel/types';

/**
 * Given a `JSXIdentifier`, return the equivalent `Identifier`.
 */
function jsxIdentifierToIdentifier({
    t,
    node,
}: {
    t: typeof Babel.types;
    node: JSXIdentifier;
}): Identifier {
    return t.identifier(node.name);
}

function jsxNamespacedNameToIdentifier(
    { t, node }: { t: typeof Babel.types, node: JSXNamespacedName }
): Identifier {
    return t.identifier(`${node.namespace.name}:${node.name.name}`);
}

/**
 * Given a `JSXMemberExpression`, return the equivalent `MemberExpression`.
 */
function jsxMemberExpressionToMemberExpression({
    t,
    node,
}: {
    t: typeof Babel.types;
    node: JSXMemberExpression;
}): MemberExpression {
    const property = jsxIdentifierToIdentifier({
        t,
        node: node.property,
    });

    let object: MemberExpression | Identifier;
    if (t.isJSXMemberExpression(node.object)) {
        object = jsxMemberExpressionToMemberExpression({
            t,
            node: node.object,
        });
    } else {
        object = jsxIdentifierToIdentifier({
            t,
            node: node.object,
        });
    }

    return t.memberExpression(object, property);
}

export function jsxToNormal(
    t: typeof Babel.types,
    node: JSXIdentifier,
): Identifier;
export function jsxToNormal(
    t: typeof Babel.types,
    node: JSXNamespacedName,
): Identifier;
export function jsxToNormal(
    t: typeof Babel.types,
    node: JSXMemberExpression,
): MemberExpression;
export function jsxToNormal(
    t: typeof Babel.types,
    node: JSXIdentifier | JSXMemberExpression,
): Identifier | MemberExpression;
export function jsxToNormal(
    t: typeof Babel.types,
    node: JSXIdentifier | JSXNamespacedName | JSXMemberExpression,
): Identifier | JSXNamespacedName | MemberExpression {
    if (t.isJSXIdentifier(node)) {
        return jsxIdentifierToIdentifier({ t, node });
    }
    if (t.isJSXNamespacedName(node)) {
        return jsxNamespacedNameToIdentifier({ t, node });
    }
    return jsxMemberExpressionToMemberExpression({ t, node });
}
