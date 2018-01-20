import { SchemaEntry, SchemaProperty, SchemaBaseProperty, SchemaFunctionProperty } from "./types";
import { workArray, modifyMap, modifyArray, toUpperCamelCase } from "./utils";
import { ErrorMessage } from "./assert";


function convertToRef(prop: SchemaProperty, id: string, entry: SchemaEntry): SchemaProperty {
    const newProp: SchemaProperty = { $ref: id, type: 'ref' };
    if (prop.name)
        newProp.name = prop.name;
    if (prop.description)
        newProp.description = prop.description;
    if (!entry.types)
        entry.types = [];
    if (prop.optional)
        newProp.optional = prop.optional;
    delete prop.name;
    prop.id = id;
    entry.types.push(prop);

    return newProp;
}

function combineNamePrefix(namePrefix: string, suffix?: string) {
    if (suffix)
        return namePrefix + toUpperCamelCase(suffix);
    return namePrefix;
}

function convertToRefIfObject(prop: SchemaProperty, propName: string, namePrefix: string | undefined, entry: SchemaEntry) {
    if (prop.type === 'object') {
        if (!namePrefix)
            throw ErrorMessage.MISSING_NAME;
        const name = combineNamePrefix(namePrefix, propName);
        const id = toUpperCamelCase(name) + 'Type';
        const newRef = convertToRef(prop, id, entry);
        // extractParameterObjectFromProperty(params[i], name, entry, false);
        return newRef;
    }
    else if (prop.type === 'string' && prop.enum) {
        if (!namePrefix)
            throw ErrorMessage.MISSING_NAME;
        const name = combineNamePrefix(namePrefix, propName);
        const id = toUpperCamelCase(name) + 'Enum';
        return convertToRef(prop, id, entry);
    }
    else if (prop.type === 'choices') {
        modifyArray(prop.choices, (choice, i) => {
            return convertToRefIfObject(choice, propName + 'C' + (i + 1), namePrefix, entry);
        });
    }
    else if (prop.type === 'function') {
        modifyArray(prop.parameters, (param, i) => {
            if (!param.name)
                throw ErrorMessage.MISSING_NAME;
            return convertToRefIfObject(param, propName + param.name, namePrefix, entry);
        });
    }
    return prop;
}

function extractParameterObjectFunction(func: SchemaFunctionProperty, entry: SchemaEntry) {
    modifyArray(func.parameters, (param) => {
        if (!param.name)
            throw ErrorMessage.MISSING_NAME;
        return convertToRefIfObject(param, param.name, func.name, entry);
    });
    if (func.returns)
        func.returns = convertToRefIfObject(func.returns, 'return', func.name, entry);
}

function extractParameterObjectType<T extends SchemaBaseProperty>(prop: SchemaProperty, namePrefix: string, isRoot: boolean, entry: SchemaEntry): T {
    if (isRoot) {
        if (!prop.id)
            throw 'Gotta have an id, dude!';
        namePrefix = toUpperCamelCase(prop.id);
    }

    if (prop.type === 'object') {
        modifyMap(prop.properties, (prop, key) => extractParameterObjectType(prop, combineNamePrefix(namePrefix, key), false, entry));
        //fixme: prop.additionalProperties
        modifyArray(prop.events, (evt) => extractParameterObjectType(evt, combineNamePrefix(namePrefix, evt.name), false, entry));
        modifyArray(prop.functions, (func) => extractParameterObjectType(func, combineNamePrefix(namePrefix, func.name), false, entry));

        if (!isRoot) {
            if (!namePrefix)
                throw ErrorMessage.MISSING_NAME;
            const id = namePrefix + 'Type';
            prop = convertToRef(prop, id, entry);
        }
    }
    else if (prop.type === 'string' && prop.enum) {
        if (!isRoot) {
            const ref = convertToRefIfObject(prop, "", namePrefix, entry);
            //@ts-ignore
            return ref;
        }
    }
    else if (prop.type === 'array' && prop.items) {
        prop.items = convertToRefIfObject(prop.items, "item", namePrefix, entry);
    }
    else if (prop.type === 'choices') {
        modifyArray(prop.choices, (choice, i) => extractParameterObjectType(choice, namePrefix + 'C' + (i + 1), false, entry));
    }
    else if (prop.type === 'function') {
        //fixme: extract/make ref/type
        //Fixme: prop.extraParameters
        modifyArray(prop.parameters, (param, i) => extractParameterObjectType(param, combineNamePrefix(namePrefix, param.name), false, entry));
        if (prop.returns)
            prop.returns = extractParameterObjectType<SchemaProperty>(prop.returns, 'Return', false, entry);
    }
    // @ts-ignore
    return prop;
}

export function extractInlineContent(entry: SchemaEntry) {
    workArray(entry.functions, (func) => extractParameterObjectFunction(func, entry));
    workArray(entry.events, (evt) => extractParameterObjectFunction(evt, entry));
    modifyMap(entry.properties, (prop, key) => {
        if (prop.$ref && prop.hasOwnProperty('properties')) {
            const id = combineNamePrefix(toUpperCamelCase(key), prop.$ref);
            const newProp = {
                type: 'object',
                additionalProperties: { $ref: prop.$ref },
                properties: (prop as any).properties
            };
            //@ts-ignore
            return convertToRef(newProp, id, entry);
        } else {
            return convertToRefIfObject(prop, key, 'Property', entry);
        }
    });

    // slice array, since array will be modified during work
    const entryTypes = entry.types && entry.types.slice();
    workArray(entryTypes, (type) => extractParameterObjectType(type, '', true, entry));
}