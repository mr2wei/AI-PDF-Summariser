import React from 'react';

export default function Menu (props) {
    return (
        <nav className="menu">
            <ul className='menu-list' aria-label="Main Menu">
                <li onClick={() => props.onClick("Home")} className='menu-item'>Home</li>
                <li onClick={() => props.onClick("About")} className='menu-item'>About</li>
            </ul>
        </nav>
    )
}