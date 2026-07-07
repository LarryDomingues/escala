import { createContext, useContext } from 'react';

const UserContext = createContext({
  user: null,
  isAuthenticated: false,
});

export function useUser() {
  return useContext(UserContext);
}

export default UserContext;
