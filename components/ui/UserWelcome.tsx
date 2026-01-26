import React from 'react';

interface UserWelcomeProps {
  showFullName?: boolean;
}

// Simple component to demonstrate context usage in tests
const UserWelcome: React.FC<UserWelcomeProps> = ({ showFullName = false }) => {
  // Mock implementation - in real component would use useAuth and useLanguage
  const mockUser = { nombre: 'Usuario', apellido: 'Test' };
  const mockGreeting = 'Bienvenido';
  const mockIsAuthenticated = true;

  if (!mockIsAuthenticated) {
    return (
      <div className="text-gray-500">
        <p>Por favor inicia sesión</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
      <h2 className="text-xl font-bold text-oaxaca-purple">
        {mockGreeting}
      </h2>
      <p className="text-gray-700 dark:text-gray-300">
        {showFullName
          ? `${mockUser.nombre} ${mockUser.apellido}`
          : mockUser.nombre
        }
      </p>
    </div>
  );
};

export default UserWelcome;
