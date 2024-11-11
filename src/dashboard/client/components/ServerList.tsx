import React from 'react';
import type { Server } from '../../types';

interface Props {
    servers: Server[];
}

export const ServerList: React.FC<Props> = ({ servers }) => {
    return (
        <div className="server-grid">
            {servers.map(server => (
                <div key={server.id} className={`server-card ${!server.hasBot ? 'disabled' : ''}`}>
                    <img src={server.icon} alt={server.name} />
                    <h3>{server.name}</h3>
                    {server.hasBot ? (
                        <button className="manage-btn">Manage</button>
                    ) : (
                        <button className="add-btn">Add Bot</button>
                    )}
                </div>
            ))}
        </div>
    );
}; 