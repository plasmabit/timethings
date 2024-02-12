export function getValue(obj: any, fieldPath: string) {
    const keys = fieldPath.split('.');
    let value = obj;
  
    for (const key of keys) {
      value = value[key];
      if (value === undefined) {
        return undefined;
      }
    }

    return value;
}

export function setValue(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let currentLevel = obj;
  
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!currentLevel[key]) {
        currentLevel[key] = {};
      }
      currentLevel = currentLevel[key];
    }

    currentLevel[keys[keys.length - 1]] = value;
}