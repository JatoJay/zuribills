import React from 'react';

export const TestComponent: React.FC = () => {
    console.log('TestComponent (named) rendering');
    return (
        <div className="p-8 text-center bg-pink-100">
            <h1>TestComponent Named Export</h1>
        </div>
    );
};
