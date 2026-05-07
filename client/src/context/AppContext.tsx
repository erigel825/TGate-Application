import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api';

interface AppContextValue {
  currentUser: User | null;
  setCurrentUser: (u: User) => void;
  users: User[];
}

const AppContext = createContext<AppContextValue>({
  currentUser: null,
  setCurrentUser: () => {},
  users: [],
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    api.getUsers().then(us => {
      setUsers(us);
      const stored = localStorage.getItem('tgate_user_id');
      const match = us.find(u => u.id === stored) || us[0];
      if (match) setCurrentUser(match);
    });
  }, []);

  const handleSetUser = (u: User) => {
    setCurrentUser(u);
    localStorage.setItem('tgate_user_id', u.id);
  };

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser: handleSetUser, users }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
