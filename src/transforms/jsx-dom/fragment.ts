import * as Babel from '@babel/core';
import {
    JSXFragment,
    Identifier,
    Statement,
    MemberExpression,
    ThisExpression,
} from '@babel/types';
import { Scope } from '@babel/traverse';
import { designator } from './designator';
import { State } from '../..';

export function frag_to_dom(
    t: typeof Babel.types,
    template: typeof Babel.template,
    state: State,
    node: JSXFragment,
    parent: Identifier | MemberExpression | ThisExpression,
    scope: Scope,
): Statement[] {
    const statements: Statement[] = [];

    const ident = scope.generateUidIdentifier('frag');

    statements.push(template.statement.ast`
        const ${ident} = document.createDocumentFragment();
    `);

    node.children.forEach(child =>
        statements.push(...designator(t, template, state, child, ident, scope)),
    );

    statements.push(template.statement.ast`
        ${parent}.appendChild(${ident});
    `);

    return statements;
}
