import React from 'react';

const TestLayout: React.FC = () => {
    console.log('TestLayout (static) rendering');
    return (
        <div className="p-8 text-center bg-primary/10">
            <h1>TestLayout Static</h1>
        </div>
    );
};
export default TestLayout;
