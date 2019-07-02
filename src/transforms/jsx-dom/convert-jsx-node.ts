import * as Babel from '@babel/core';
import {
    JSXIdentifier,
    Identifier,
    JSXMemberExpression,
    MemberExpression,
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
    node: JSXMemberExpression,
): MemberExpression;
export function jsxToNormal(
    t: typeof Babel.types,
    node: JSXIdentifier | JSXMemberExpression,
): Identifier | MemberExpression;
export function jsxToNormal(
    t: typeof Babel.types,
    node: JSXIdentifier | JSXMemberExpression,
): Identifier | MemberExpression {
    if (t.isJSXIdentifier(node)) {
        return jsxIdentifierToIdentifier({ t, node });
    }
    return jsxMemberExpressionToMemberExpression({
        t,
        node,
    });
}
