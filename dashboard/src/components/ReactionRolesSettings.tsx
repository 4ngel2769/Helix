'use client';

import { useState } from 'react';

const ReactionRolesSettings = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="bg-gray-800 p-4 rounded-lg mt-4">
      <h2 className="text-xl font-bold mb-2">Reaction Roles</h2>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Create New Reaction Role Menu
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-8 rounded-lg w-1/2">
            <h3 className="text-2xl font-bold mb-4">New Reaction Role Menu</h3>
            <p>Form to create a new reaction role menu will be here.</p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReactionRolesSettings;
