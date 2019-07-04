import * as Babel from '@babel/core';
import {
    Statement,
    JSXElement,
    Identifier,
    MemberExpression,
    VariableDeclaration,
    ThisExpression,
    JSXAttribute,
    JSXExpressionContainer,
    Expression,
    ClassDeclaration,
} from '@babel/types';
import { jsxToNormal } from './convert-jsx-node';
import { Scope } from '@babel/traverse';
import { build_attributes } from './attributes';
import { designator } from './designator';
import { State } from '../..';
import { Key } from '../../state_key';

const enum BuildType {
    Newable,
    CreateElement,
    CeContents,
}

function get_constructor_type(
    t: typeof Babel.types,
    node: Identifier | MemberExpression,
): BuildType {
    if (t.isIdentifier(node) && node.name.toLowerCase() === 'ce:contents') {
        return BuildType.CeContents;
    }

    if (
        (t.isIdentifier(node)
            && node.name.startsWith(node.name[0].toUpperCase()))
        || t.isMemberExpression(node)
    ) {
        return BuildType.Newable;
    }

    return BuildType.CreateElement;
}

function build_constructor({
    t,
    template,
    el_name_expr,
    el_name_str,
    parent,
    ident,
}: {
    t: typeof Babel.types;
    template: typeof Babel.template;
    el_name_expr: Identifier | MemberExpression;
    el_name_str: string;
    parent: Identifier | MemberExpression | ThisExpression;
    ident: Identifier;
}): Statement[] {
    const type = get_constructor_type(t, el_name_expr);

    if (type === BuildType.Newable) {
        return [template.statement.ast`
            const ${ident} = ${parent}.appendChild(
                new ${el_name_expr}()
            );
        `];
    } else if (type === BuildType.CreateElement) {
        return [template.statement.ast`
            const ${ident} = ${parent}.appendChild(
                document.createElement(
                    ${t.stringLiteral(el_name_str)}
                )
            );
        `];
    } else if (type === BuildType.CeContents) {
        return template.statements.ast`
            const ${ident} = ${parent}.appendChild(
                document.createElement('div')
            );
            ${ident}.style.display = 'contents';
        `;
    }

    throw new Error('Unknown BuildType');
}

function build_constructor_bare({
    t,
    template,
    el_name_expr,
    el_name_str,
    parent,
}: {
    t: typeof Babel.types;
    template: typeof Babel.template;
    el_name_expr: Identifier | MemberExpression;
    el_name_str: string;
    parent: Identifier | MemberExpression | ThisExpression;
}): VariableDeclaration {
    if (get_constructor_type(t, el_name_expr) === BuildType.Newable) {
        return template.ast`
            ${parent}.appendChild(new ${el_name_expr}());
        ` as VariableDeclaration;
    }
    return template.ast`
        ${parent}.appendChild(
            document.createElement(
                ${t.stringLiteral(el_name_str)}
            )
        );
    ` as VariableDeclaration;
}

export function element_to_dom(
    {
        t,
        template,
        state,
        node,
        parent,
        scope,
        klass,
    }: {
        t: typeof Babel.types;
        template: typeof Babel.template;
        state: State;
        node: JSXElement;
        parent: Identifier | MemberExpression | ThisExpression;
        scope: Scope;
        klass: ClassDeclaration;
    },
): Statement[] {
    const statements: Statement[] = [];

    const el_name_expr = jsxToNormal(t, node.openingElement.name);
    const el_name_str = t.isIdentifier(el_name_expr)
        ? el_name_expr.name
        : (el_name_expr.property as Identifier).name;
    const ident = scope.generateUidIdentifier(el_name_str);

    const static_if = node.openingElement.attributes.find(attr => {
        return t.isJSXAttribute(attr)
            && t.isJSXNamespacedName(attr.name)
            && attr.name.namespace.name === 'static'
            && attr.name.name.name === 'if'
            && t.isJSXExpressionContainer(attr.value)
            && t.isExpression(attr.value.expression);
    }) as JSXAttribute | undefined;

    statements.push(
        ...build_constructor({
            t,
            template,
            el_name_expr,
            el_name_str,
            parent,
            ident,
        }),
    );

    if (state[Key.needs_ref].has(node)) {
        const private_refs = t.privateName(t.identifier('refs'));
        statements.push(template.statement.ast`
            this.${private_refs}.push(${ident});
        `);
    }

    statements.push(
        ...build_attributes(
            { t, template },
            state,
            node.openingElement.attributes,
            ident,
            klass,
        ),
    );

    node.children.forEach(child =>
        statements.push(...designator({
            t,
            template,
            state,
            node: child,
            parent: ident,
            scope,
            klass,
        })),
    );

    if (static_if === undefined) {
        // Only constructor and appending, nothing else.
        if (statements.length === 1) {
            return [
                build_constructor_bare({
                    t,
                    template,
                    el_name_expr,
                    el_name_str,
                    parent,
                }),
            ];
        }

        return statements;
    }

    // Only constructor and appending, nothing else.
    if (statements.length === 1) {
        return [t.ifStatement(
            ((static_if.value as JSXExpressionContainer)
                .expression as Expression),
            build_constructor_bare({
                t,
                template,
                el_name_expr,
                el_name_str,
                parent,
            }),
        )];
    }

    return [t.ifStatement(
        (static_if.value as JSXExpressionContainer).expression as Expression,
        t.blockStatement(statements),
    )];
}
