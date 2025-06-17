import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ClientEvent, DamageCategory, IInstance, ViewType } from '@dmg-meter/types';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { toast } from 'sonner';
import { isTauri } from '@tauri-apps/api/core';
import { useToolbar } from '@/hooks/useToolbar';

interface InstancesContextProps {
  duplicateInstance: () => void;
  updateInstance: (instance: Partial<IInstance>) => void;
  deleteInstance: (instanceId: string) => void;
  instance: IInstance;
  isLoading: boolean;
}

const InstancesContext = createContext<InstancesContextProps | undefined>(undefined);

interface InstancesProviderProps {
  children: ReactNode;
  instanceId: string;
}

export const InstancesProvider: React.FC<InstancesProviderProps> = ({ children, instanceId }) => {
  const { socket } = useWebSocket();
  const [instance, setInstance] = useState<IInstance>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInstance(instanceId);
  }, [instanceId]);

  const duplicateInstance = () => {
    socket?.emit(ClientEvent.InstanceDuplicate);
  };

  const fetchInstance = useCallback(
    async (instanceId: string) => {
      try {
        const response = await fetch(`http://localhost:3001/api/instances/${instanceId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch instance: ${response.statusText}`);
        }
        const data = await response.json();
        setInstance(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching instance:', error);
      }
    },
    [instanceId],
  );

  const deleteInstance = useCallback(async (instanceId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/instances/${instanceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 400) {
          toast.error(data.message);
          return;
        }
        throw new Error(`Failed to delete instance: ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      isTauri() ? getCurrentWebviewWindow().close() : window.close();
    } catch (error) {
      console.error('Error deleting instance:', error);
    }
  }, []);

  const updateInstance = useCallback(
    (update: Partial<IInstance>) => {
      setInstance((prev) => {
        const updatedInstance = { ...prev, ...update };
        socket.emit(ClientEvent.InstanceUpdate, updatedInstance); // Emit the updated state
        return updatedInstance; // Ensure state is updated correctly
      });
    },
    [socket], // Removed `instance` dependency
  );

  return (
    <InstancesContext.Provider value={{ duplicateInstance, deleteInstance, instance, updateInstance, isLoading }}>
      {children}
    </InstancesContext.Provider>
  );
};

export const useInstance = (): InstancesContextProps => {
  const context = useContext(InstancesContext);
  if (!context) {
    throw new Error('useInstances must be used within an InstancesProvider');
  }
  return context;
};
