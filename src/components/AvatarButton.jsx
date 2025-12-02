import React from 'react';
import { MessageCircle } from 'lucide-react';
import './AvatarButton.css';

const AvatarButton = ({ onClick }) => {
    return (
        <button
            className="avatar-button"
            onClick={onClick}
            aria-label="Open AI Assistant"
        >
            <MessageCircle size={24} />
        </button>
    );
};

export default AvatarButton;

