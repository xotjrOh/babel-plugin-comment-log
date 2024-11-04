# babel-plugin-comment-log

A Babel plugin that injects logging code based on comments in React components.

## Example

**In**

```javascript
// @log(member, horses, score)
```

**Out**

```javascript
member : ["ahn", "lee", "choi"]
horses : ["A", "B", "C", "D"]
score : 13
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
In your React component file, add a comment at the top:

```javascript
// log(count, horses, ids)

import React, { useState } from 'react';

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

In production mode, the plugin does nothing, and no extra code is added to your bundle.

## 📄 LICENSE

[MIT 라이선스](LICENSE)