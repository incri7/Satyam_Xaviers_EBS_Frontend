import React from 'react';
import logo from '../../assets/logo.png';

export const SchoolLogo: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => {
    return (
        <div className={`rounded-full bg-white flex items-center justify-center p-1 overflow-hidden ${className}`}>
            <img
                src={logo}
                alt="Satyam English School Logo"
                className="w-full h-full object-contain"
            />
        </div>
    );
};
