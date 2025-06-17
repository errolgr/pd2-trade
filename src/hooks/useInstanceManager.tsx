import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ClientEvent, IInstance } from '@dmg-meter/types';

interface InstancesContextProps {
  instances: IInstance[];
  updateInstance: (instanceId: string, instance: Partial<IInstance>) => void;
}

const InstancesContext = createContext<InstancesContextProps | undefined>(undefined);

interface InstancesProviderProps {
  children: ReactNode;
}

export const InstanceManagerProvider: React.FC<InstancesProviderProps> = ({ children }) => {
  const [instances, setInstances] = useState<IInstance[]>([]);
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(ClientEvent.InstanceInit, (instances: IInstance[]) => {
      setInstances(instances);
    });

    socket.on(ClientEvent.InstanceDuplicate, (newInstance: IInstance) => {
      setInstances((prev) => [...prev, newInstance]);
    });

    socket.on(ClientEvent.InstanceDelete, (deleteInstance: IInstance) => {
      setInstances((prev) => prev.filter((instance) => instance.id !== deleteInstance.id));
    });

    socket.emit(ClientEvent.InstanceInit);

    return () => {
      socket.off(ClientEvent.InstanceInit);
      socket.off(ClientEvent.InstanceDuplicate);
      socket.off(ClientEvent.InstanceDelete);
      socket.off('connect');
    };
  }, [socket]);

  const updateInstance = useCallback(
    (instanceId: string, update: Partial<IInstance>) => {
      setInstances((prevState) => {
        const updatedInstances = prevState.map((item) => (item.id === instanceId ? { ...item, ...update } : item));
        const updatedInstance = updatedInstances.find((item) => item.id === instanceId);
        if (updatedInstance && socket) {
          socket.emit(ClientEvent.InstanceUpdate, {
            id: updatedInstance.id,
            x: updatedInstance.x,
            y: updatedInstance.y,
          }); // only update x and y from instance manager.
        }
        return updatedInstances;
      });
    },
    [socket],
  );

  return <InstancesContext.Provider value={{ instances, updateInstance }}>{children}</InstancesContext.Provider>;
};

export const useInstanceManager = (): InstancesContextProps => {
  const context = useContext(InstancesContext);
  if (!context) {
    throw new Error('useInstances must be used within an InstancesProvider');
  }
  return context;
};
