import { useSalesContext } from "../context/SalesContext";

const useSalesUpdate = () => {
  const {
    updateSale,
    updatingSale,
    error,
    clearError,
  } = useSalesContext();

  return {
    updateSale,
    updatingSale,
    error,
    clearError,
  };
};

export default useSalesUpdate;