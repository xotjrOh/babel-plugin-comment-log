module.exports = function ({ types: t }) {
    return {
        visitor: {
            Program(path) {
                // 프로덕션 환경에서는 플러그인 실행 중단
                if (process.env.NODE_ENV === 'production') return;

                path.get('body').forEach((nodePath) => {
                    if (t.isFunctionDeclaration(nodePath.node)) {
                        processFunction(nodePath, t);
                    } else if (t.isVariableDeclaration(nodePath.node)) {
                        processVariableDeclaration(nodePath, t);
                    } else if (t.isExportDefaultDeclaration(nodePath.node)) {
                        processExportDefault(nodePath, t);
                    }
                });
            },
        },
    };
};

// 유틸리티 함수들

function processFunction(path, t) {
    if (!isComponentOrHook(path)) return;
    const leadingComments = getLeadingComments(path);
    const logComments = findLogComments(leadingComments);
    if (logComments.length > 0) {
        logComments.forEach(logComment => {
            const variableNames = extractVariableNames(logComment);
            if (variableNames.length > 0) {
                injectUseEffect(path, t, variableNames);
            }
        });
    }
}

function processVariableDeclaration(path, t) {
    const declarations = path.node.declarations;
    for (let i = 0; i < declarations.length; i++) {
        const declaration = declarations[i];
        if (
            t.isVariableDeclarator(declaration) &&
            (t.isFunctionExpression(declaration.init) ||
                t.isArrowFunctionExpression(declaration.init))
        ) {
            const funcPath = path.get(`declarations.${i}.init`);
            if (isComponentOrHook(funcPath)) {
                const leadingComments = getLeadingComments(path);
                const logComments = findLogComments(leadingComments);
                if (logComments.length > 0) {
                    logComments.forEach(logComment => {
                        const variableNames = extractVariableNames(logComment);
                        if (variableNames.length > 0) {
                            injectUseEffect(funcPath, t, variableNames);
                        }
                    });
                }
            }
        }
    }
}

function processExportDefault(path, t) {
    const decl = path.get('declaration');
    if (
        t.isFunctionDeclaration(decl.node) ||
        t.isFunctionExpression(decl.node) ||
        t.isArrowFunctionExpression(decl.node)
    ) {
        if (!isComponentOrHook(decl)) return;
        const leadingComments = getLeadingComments(path);
        const logComments = findLogComments(leadingComments);
        if (logComments.length > 0) {
            logComments.forEach(logComment => {
                const variableNames = extractVariableNames(logComment);
                if (variableNames.length > 0) {
                    injectUseEffect(decl, t, variableNames);
                }
            });
        }
    }
}

function isComponentOrHook(path) {
    let name = path.node.id ? path.node.id.name : null;
    if (!name && path.parent && path.parent.type === 'VariableDeclarator') {
        name = path.parent.id.name;
    }
    return name && (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name));
}

function getLeadingComments(path) {
    let leadingComments = [];
    if (path.node.leadingComments) {
        leadingComments = leadingComments.concat(path.node.leadingComments);
    }
    if (path.parent && path.parent.leadingComments) {
        leadingComments = leadingComments.concat(path.parent.leadingComments);
    }
    return leadingComments;
}

function findLogComments(comments) {
    if (!comments) return [];
    return comments
        .map(comment => comment.value.replace(";", "").trim())
        .filter(value => value.startsWith('@log('));
}

function extractVariableNames(commentValue) {
    const variablesString = commentValue.slice(5, -1); // '@log(' 와 ')' 제거
    const variableNames = variablesString
        .split(',')
        .map(name => name.trim())
        .filter(Boolean);
    return variableNames;
}

function injectUseEffect(path, t, variableNames) {
    // useEffect import 추가
    addUseEffectImport(path, t);

    // useEffect 훅 생성
    const useEffectHook = createUseEffectHook(t, variableNames);

    // 함수 본문에 useEffect 추가
    const bodyPath = path.get('body');
    if (bodyPath.isBlockStatement()) {
        const bodyStatements = bodyPath.get('body');
        let insertIndex = 0;

        // 변수 선언 또는 다른 훅 호출 이후에 삽입
        for (let i = 0; i < bodyStatements.length; i++) {
            const stmt = bodyStatements[i];
            if (
                stmt.isVariableDeclaration() ||
                (stmt.isExpressionStatement() &&
                    stmt.get('expression').isCallExpression() &&
                    /^use[A-Z]/.test(stmt.get('expression.callee').node.name))
            ) {
                insertIndex = i + 1;
            } else {
                break;
            }
        }

        // useEffect 삽입
        bodyPath.node.body.splice(insertIndex, 0, useEffectHook);
    }
}

function addUseEffectImport(path, t) {
    const program = path.find(p => p.isProgram());
    const body = program.node.body;
    const hasUseEffectImport = body.some(node => {
        return (
            t.isImportDeclaration(node) &&
            node.source.value === 'react' &&
            node.specifiers.some(spec => 
                t.isImportSpecifier(spec) && spec.imported.name === 'useEffect'
            )
        );
    });

    if (!hasUseEffectImport) {
        const reactImport = body.find(node => 
            t.isImportDeclaration(node) && node.source.value === 'react'
        );

        if (reactImport) {
            reactImport.specifiers.push(
                t.importSpecifier(t.identifier('useEffect'), t.identifier('useEffect'))
            );
        } else {
            // react import가 없는 경우 추가
            const newImport = t.importDeclaration(
                [t.importSpecifier(t.identifier('useEffect'), t.identifier('useEffect'))],
                t.stringLiteral('react')
            );
            body.unshift(newImport);
        }
    }
}

function createUseEffectHook(t, variableNames) {
    const variablesObject = t.objectExpression(
        variableNames.map(varName => 
            t.objectProperty(t.identifier(varName), t.identifier(varName), false, true)
        )
    );

    const consoleLog = t.expressionStatement(
        t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [variablesObject]
        )
    );

    const useEffectBody = t.blockStatement([consoleLog]);

    const useEffectHook = t.expressionStatement(
        t.callExpression(t.identifier('useEffect'), [
            t.arrowFunctionExpression([], useEffectBody),
            t.arrayExpression(variableNames.map(varName => t.identifier(varName))),
        ])
    );

    return useEffectHook;
}
