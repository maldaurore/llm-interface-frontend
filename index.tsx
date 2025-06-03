import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import LoginPage from './components/LoginPage.tsx';
import RegisterPage from './components/RegisterPage.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import ChatWrapper from './components/ChatWrapper.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: "", element: <Navigate to="/new-chat" replace />},
      {path: "new-chat", element: <ChatInterface />},
      { path: "chat/:id", element: <ChatWrapper /> },
    ]
  },
])

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);