import * as Babel from '@babel/core';
import { State } from '../..';
import {
    JSXExpressionContainer,
    MemberExpression,
    Identifier,
    Statement,
    JSXText,
    ThisExpression,
} from '@babel/types';
import { Scope } from '@babel/traverse';
import { Key } from '../../state_key';

export function dynamic_text_to_dom(
    t: typeof Babel.types,
    template: typeof Babel.template,
    state: State,
    node: JSXExpressionContainer,
    parent: Identifier | MemberExpression | ThisExpression,
    scope: Scope,
): Statement[] {
    const statements: Statement[] = [];

    const { expression } = node;
    const ident = scope.generateUidIdentifier('text');

    if (state[Key.needs_ref].has(node)) {
        const private_refs = t.privateName(t.identifier('refs'));

        statements.push(...template.statements.ast`
            const ${ident} = ${parent}.appendChild(
                document.createTextNode(${expression})
            );

            this.${private_refs}.push(${ident});
        `);
    } else {
        statements.push(template.statement.ast`
            ${parent}.appendChild(document.createTextNode(${expression}));
        `);
    }

    return statements;
}

export function static_text_to_dom(
    t: typeof Babel.types,
    template: typeof Babel.template,
    node: JSXText,
    parent: Identifier | MemberExpression | ThisExpression,
): Statement[] {
    const value = node.value.trim();

    if (value === '') {
        return [];
    }

    return [template.statement.ast`
        ${parent}.appendChild(
            document.createTextNode(
                ${t.stringLiteral(value)}
            )
        );
    `];
}
