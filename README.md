# babel-plugin-comment-log

A Babel plugin that injects logging code based on comments in React components.

## Example

**In**

```javascript
// @log(member, horses, score)
```

**Out**

```javascript
{ member : ["ahn", "lee", "choi"], horses : ["horse1", "horse2"], score : 13 }
```

## Installation

```bash
npm install --save-dev babel-plugin-comment-log
```

## Usage
### For Next.js Projects
Next.js uses `.babelrc` for Babel configuration. To integrate babel-plugin-comment-log into your Next.js project, update your .babelrc file as follows:

```json
{
  "presets": ["next/babel"],
  "plugins": ["babel-plugin-comment-log"],
  "ignore": ["node_modules"]
}
```
> Note: The next/babel preset includes necessary configurations for Next.js, ensuring compatibility with both ES6+ syntax and React JSX. If your project already uses this preset, no additional configuration is needed.

### For General React Projects
If you're not using Next.js, you can configure Babel using `babel.config.js`. Here's how to set it up:

1. Create or update `babel.config.js` in the root of your project:

```javascript
module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: ['babel-plugin-comment-log'],
};
```
2. Ensure Babel is properly configured in your project. If you already have a babel.config.js or .babelrc file, make sure to include the babel-plugin-comment-log in the plugins array.

> Note: The `@babel/preset-env` and `@babel/preset-react` presets are used to transpile modern JavaScript and React JSX syntax. If your project already uses these presets, you only need to add babel-plugin-comment-log to the plugins array.

## How It Works
By adding a `// @log` comment at the top of your React functional components, this plugin automatically injects a useEffect hook that logs the specified variables whenever they change.

### In your React component
```javascript
import React, { useState } from 'react';

// @log(count, horses, ids)
function MyComponent(props) {
  const [count, setCount] = useState(0);
  const [horses, setHorses] = useState(['horse1', 'horse2']);
  const ids = useSelector((state) => state.ids);

  // Your component logic...

  return <div>...</div>;
}

export default MyComponent;
```

### Resulting Code
After applying the plugin, the component will be transformed as follows:

```javascript
import React, { useState, useEffect } from 'react';

function MyComponent(props) {
  const [count, setCount] = useState(0);
  const [horses, setHorses] = useState(['horse1', 'horse2']);
  const ids = useSelector((state) => state.ids);

  // Automatically injected useEffect by babel-plugin-comment-log
  useEffect(() => {
    console.log({ count, horses, ids });
  }, [count, horses, ids]);

  // Your component logic...

  return <div>...</div>;
}

export default MyComponent;
```
### Production Mode
In production mode, the plugin does nothing, and no extra code is added to your bundle, ensuring optimal performance.

## ⚠️ Important Notes
1. **Not compatible with class components**: This plugin is designed to work only with functional components and cannot be used in class components.

2. **Server components limitation (Next.js 13+)**: This plugin will cause errors if used within server components in Next.js 13 or higher. It is intended for use in client components only, so please ensure correct component types when using Next.js 13 or newer.

## 📄 LICENSE

[MIT LICENSE](LICENSE)