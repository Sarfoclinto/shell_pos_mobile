import { useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useScannerStore } from "../store/scanner.store";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { sessionId, serverUrl, scannerToken, setStatus, clearPairing } =
    useScannerStore();

  const connect = () => {
    if (
      !sessionId ||
      !serverUrl ||
      !scannerToken ||
      socketRef.current?.connected
    )
      return;

    const socket = io(serverUrl, {
      //   path: "/socket.io",
      auth: {
        token: scannerToken,
        role: "scanner",
        sessionId,
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    // Session expired — clear storage and go back to home
    socket.on("scanner:session-expired", () => {
      clearPairing();
    });

    return socket;
  };

  const disconnect = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  const emitScan = (barcode: string, type: string) => {
    if (!socketRef.current?.connected || !sessionId) return;
    socketRef.current.emit("scanner:scan", {
      barcode,
      type,
      sessionId,
    });
  };

  const onAck = (cb: (data: { productName: string; qty: number }) => void) => {
    socketRef.current?.on("scanner:ack", cb);
    return () => socketRef.current?.off("scanner:ack", cb);
  };

  return { connect, disconnect, emitScan, onAck, socket: socketRef.current };
};
