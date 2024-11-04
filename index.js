module.exports = function ({ types: t }) {
    return {
        visitor: {
            Program(path) {
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
    const logComment = findLogComment(leadingComments);
    if (logComment) {
        const variableNames = extractVariableNames(logComment);
        if (variableNames.length > 0) {
            injectUseEffect(path, t, variableNames);
        }
    }
}

function processVariableDeclaration(path, t) {
    const declarations = path.node.declarations;
    for (var i = 0; i < declarations.length; i++) {
        var declaration = declarations[i];
        if (
            t.isVariableDeclarator(declaration) &&
            (t.isFunctionExpression(declaration.init) ||
                t.isArrowFunctionExpression(declaration.init))
        ) {
            var funcPath = path.get('declarations.' + i + '.init');
            if (isComponentOrHook(funcPath)) {
                const leadingComments = getLeadingComments(path);
                const logComment = findLogComment(leadingComments);
                if (logComment) {
                    const variableNames = extractVariableNames(logComment);
                    if (variableNames.length > 0) {
                        injectUseEffect(funcPath, t, variableNames);
                    }
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
        const logComment = findLogComment(leadingComments);
        if (logComment) {
            const variableNames = extractVariableNames(logComment);
            if (variableNames.length > 0) {
                injectUseEffect(decl, t, variableNames);
            }
        }
    }
}

function isComponentOrHook(path) {
    var name = path.node.id ? path.node.id.name : null;
    if (!name && path.parent && path.parent.type === 'VariableDeclarator') {
        name = path.parent.id.name;
    }
    return name && /^[A-Z]|^use[A-Z]/.test(name);
}

function getLeadingComments(path) {
    var leadingComments = [];
    if (path.node.leadingComments) {
        leadingComments = leadingComments.concat(path.node.leadingComments);
    }
    if (path.parent && path.parent.leadingComments) {
        leadingComments = leadingComments.concat(path.parent.leadingComments);
    }
    return leadingComments;
}

function findLogComment(comments) {
    if (!comments) return null;
    for (var i = 0; i < comments.length; i++) {
        var comment = comments[i];
        var value = comment.value.replace(";", "").trim();
        if (value.startsWith('@log(')) {
            return value;
        }
    }
    return null;
}

function extractVariableNames(commentValue) {
    var variablesString = commentValue.slice(5, -1); // '@log(' 와 ')' 제거
    var variableNames = variablesString
        .split(',')
        .map(function (name) {
            return name.trim();
        })
        .filter(Boolean);
    return variableNames;
}

function injectUseEffect(path, t, variableNames) {
    // if (process.env.NODE_ENV === 'production') return;

    // useEffect import 추가
    addUseEffectImport(path, t);

    // useEffect 훅 생성
    var useEffectHook = createUseEffectHook(t, variableNames);

    // 함수 본문에 useEffect 추가
    var bodyPath = path.get('body');
    if (bodyPath.isBlockStatement()) {
        bodyPath.node.body.push(useEffectHook);
    }
}

function addUseEffectImport(path, t) {
    var program = path.find(function (p) {
        return p.isProgram();
    });
    var body = program.node.body;
    var hasUseEffectImport = body.some(function (node) {
        return (
            t.isImportDeclaration(node) &&
            node.source.value === 'react' &&
            node.specifiers.some(function (spec) {
                return t.isImportSpecifier(spec) && spec.imported.name === 'useEffect';
            })
        );
    });

    if (!hasUseEffectImport) {
        var reactImport = body.find(function (node) {
            return t.isImportDeclaration(node) && node.source.value === 'react';
        });

        if (reactImport) {
            reactImport.specifiers.push(
                t.importSpecifier(t.identifier('useEffect'), t.identifier('useEffect'))
            );
        } else {
            // react import가 없는 경우 추가
            var newImport = t.importDeclaration(
                [t.importSpecifier(t.identifier('useEffect'), t.identifier('useEffect'))],
                t.stringLiteral('react')
            );
            body.unshift(newImport);
        }
    }
}

function createUseEffectHook(t, variableNames) {
    var variablesObject = t.objectExpression(
        variableNames.map(function (varName) {
            return t.objectProperty(t.identifier(varName), t.identifier(varName), false, true);
        })
    );

    var consoleLog = t.expressionStatement(
        t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [variablesObject]
        )
    );

    var useEffectBody = t.blockStatement([consoleLog]);

    var useEffectHook = t.expressionStatement(
        t.callExpression(t.identifier('useEffect'), [
            t.functionExpression(null, [], useEffectBody),
            t.arrayExpression(variableNames.map(function (varName) {
                return t.identifier(varName);
            })),
        ])
    );

    return useEffectHook;
}
