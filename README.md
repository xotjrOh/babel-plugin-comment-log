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
Add the plugin to your `babel.config.js`:

```javascript
module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: ['babel-plugin-comment-log'],
};
```
> Note: The @babel/preset-env and @babel/preset-react presets are used here to ensure compatibility with ES6+ syntax and React JSX. If your project already uses these presets, no additional configuration is needed.

In your React component file, add a comment at the top:

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
In development mode, this will inject a useEffect hook that logs the specified variables whenever they change.

## Resulting Code
The following code demonstrates how useEffect is automatically injected with logging functionality:

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
In production mode, the plugin does nothing, and no extra code is added to your bundle.

## ⚠️ Important Notes
1. **Not compatible with class components**: This plugin is designed to work only with functional components and cannot be used in class components.

2. **Server components limitation (Next.js 13+)**: This plugin will cause errors if used within server components in Next.js 13 or higher. It is intended for use in client components only, so please ensure correct component types when using Next.js 13 or newer.

## 📄 LICENSE

[MIT 라이선스](LICENSE)