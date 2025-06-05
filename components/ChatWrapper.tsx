import React from "react";
import { useParams } from "react-router-dom";

import ChatInterface from "../components/ChatInterface";

const ChatWrapper: React.FC = () => {
  const { id } = useParams();
  return <ChatInterface key={id} />;
};

export default ChatWrapper;