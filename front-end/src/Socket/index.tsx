import React, { PropsWithChildren, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { generateName } from "../Utils/utils";

interface SocketContextState {
  socket: undefined | Socket;
  data: any;
  error: undefined | string;
  loading: boolean;
  id: string;
};

export const SocketContext = React.createContext<SocketContextState>({
  socket: undefined,
  data: undefined,
  error: undefined,
  loading: true,
  id: "",
});

export default function Socketed(props: PropsWithChildren<{}>): JSX.Element {
  const { children } = props;

  const [state, setState] = useState<SocketContextState>({
    socket: undefined,
    data: undefined,
    error: undefined,
    loading: false,
    id: generateName()
  });
  const { socket, id } = state;

  /**
   * Setup Socket
   */
  useEffect(() => {
    if (socket === undefined) {
      const newSocket = io("https://api.joaco.co/", {
        query: {
          id
        },
      });

      const logsListener = () => {
        setState({
          socket: newSocket,
          data: undefined,
          error: undefined,
          loading: false,
          id
        });
      };

      newSocket.on("connect", logsListener);

      return () => {
        newSocket.off("connect", logsListener);
      };
    }
  }, [socket, id]);

  return (
    <SocketContext.Provider value={state}>
      {children}
    </SocketContext.Provider>
  );
}
