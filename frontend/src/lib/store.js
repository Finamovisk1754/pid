import { createContext, useContext, useState, useCallback, useMemo } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [dataset, setDataset] = useState(null); // { time, input, output, reference_params, name }
  const [identification, setIdentification] = useState(null); // { k, tau, theta, mse, t1, t2, y0, y_inf, u0, u_step, t_step, y_model }
  const [pid, setPid] = useState({ Kp: 1, Ti: 1, Td: 0, method: "ziegler-nichols" });
  const [setpoint, setSetpoint] = useState(56.25);
  const [simulation, setSimulation] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const resetAll = useCallback(() => {
    setIdentification(null);
    setSimulation(null);
    setPid({ Kp: 1, Ti: 1, Td: 0, method: "ziegler-nichols" });
  }, []);

  const value = useMemo(
    () => ({
      dataset,
      setDataset,
      identification,
      setIdentification,
      pid,
      setPid,
      setpoint,
      setSetpoint,
      simulation,
      setSimulation,
      notifications,
      setNotifications,
      resetAll,
    }),
    [dataset, identification, pid, setpoint, simulation, notifications, resetAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
