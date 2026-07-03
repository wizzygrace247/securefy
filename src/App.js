import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
function App() {
    const [url, setUrl] = useState('');
    useEffect(() => {
        const ext = window.chrome;
        if (ext?.tabs?.query) {
            ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                setUrl(tabs[0]?.url || 'No URL found');
            });
        }
        else {
            setUrl('No URL found');
        }
    }, []);
    return (_jsxs("div", { style: { padding: '1rem', minWidth: '300px' }, children: [_jsx("h2", { children: "Current Page URL" }), _jsx("p", { style: { wordBreak: 'break-all' }, children: url })] }));
}
export default App;
