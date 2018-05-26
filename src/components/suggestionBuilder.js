import jp from 'jsonpath/jsonpath.min';

const suggestions = [
    {
        "description": "access a specific property",
        "value": ".",
        "scopes": ["array", "object"]
    },
    {
        "description": "search recursively for a property",
        "value": "..",
        "scopes": ["array", "object"]
    },
    {
        "value": "all_properties",
        "scopes": ["."]
    },
    {
        "value": "all_properties_recursively",
        "scopes": [".."]
    },
    {
        "description": "get collection size",
        "value": ".length",
        "scopes": ["array"]
    },
    {
        "description": "pick a value in a collection",
        "value": "[]",
        "setCarretAt": 1,
        "scopes": ["array"]
    },
    {
        "description": "filter a collection",
        "value": "?(@)",
        "setCarretAt": 3,
        "scopes": ["[]"]
    },
    {
        "description": "select an item by it's index relatively to the size of the collection",
        "value": "(@.length-1)",
        "setCarretAt": 10,
        "scopes": ["[]"]
    },
    {
        "description": "select a range of item by their indexes",
        "value": "0:1",
        "setCarretAt": 0,
        "scopes": ["[]"]
    },
    {
        "description": "retrieves last item in a collection",
        "value": "-1:",
        "scopes": ["[]"]
    },
    {
        "description": "get all values",
        "value": ".*",
        "scopes": ["array", "object"]
    },
    {
        "description": "get all values",
        "value": "*",
        "scopes": ["[]", "."]
    },
]

export const getSuggestion = (jsonPath, carretPosition, jsonSchema, jsonToTestAgainst) => {
    try {
        const filteredJson = jp.query(jsonToTestAgainst, jsonPath);
        if (Array.isArray(filteredJson)) {
            return suggestions.filter(s => s.scopes.includes('array'));
        } else {
            return suggestions.filter(s => s.scopes.includes('object'));
        }
    } catch(e) {
        const appliableScopes = suggestions.filter(s => jsonPath.endsWith(s.value))

        if (appliableScopes.length > 0) {
            // Check if there is any conditions on carret position for appliableScope
            const appliableScope = appliableScopes[appliableScopes.length-1];
            if (appliableScope.setCarretAt) {
                if (jsonPath.length - carretPosition - 1 === appliableScope.setCarretAt) {
                    return suggestions.filter(s => s.scopes.includes(appliableScope.value));
                } else {
                    return [];
                }
            } else {
                return flatten(evalAllProperties(
                    suggestions.filter(s => s.scopes.includes(appliableScope.value)),
                    jsonPath,
                    jsonSchema,
                    jsonToTestAgainst
                ));
            }
        } else {
            return [];
        }
    }
}

const flatten = (arr) => {
    return [].concat(...arr)
}

const evalAllProperties = (suggestions, jsonPath, jsonSchema, jsonToTestAgainst) => {
    return suggestions.map(s => {
        if (s.value === 'all_properties') {
            const jsonPathToObject = jsonPath.substring(0, jsonPath.length - 1);
            const filteredJson = jp.query(jsonToTestAgainst, jsonPathToObject)[0];
            
            const properties = Object.keys(filteredJson);
            return properties.map(p => ({
                value: p,
                description: 'property',
                scopes: ['object']
            }))
        } else if (s.value === 'all_properties_recursively') {
            const jsonPathToObject = jsonPath.substring(0, jsonPath.length - 2);
            const filteredJson = jp.query(jsonToTestAgainst, jsonPathToObject)[0];

            const properties = Array.from(new Set(getAllPropertiesRecursively(filteredJson)));
            return properties.map(p => ({
                value: p,
                description: 'property',
                scopes: ['object']
            }))
        } else {
            return s;
        }
    })
}

const getAllPropertiesRecursively = (objectOrArray) => {
    if (Array.isArray(objectOrArray)) {
        return flatten(objectOrArray.map(arrayEntry => {
            return getAllPropertiesRecursively(arrayEntry);
        })).filter(p => p !== null && typeof p !== 'undefined');
    } else if (typeof objectOrArray === 'object') {
        const keys = Object.keys(objectOrArray);
        const subkeys = keys.map(key => {
            return getAllPropertiesRecursively(objectOrArray[key]);
        }).filter(k => k !== null);
        return flatten([...keys, ...subkeys]).filter(p => p !== null && typeof p !== 'undefined');
    } else {
        return null;
    }
}