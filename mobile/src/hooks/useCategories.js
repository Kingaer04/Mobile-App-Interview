import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useLive } from '../context/LiveContext';

export default function useCategories() {
  const { version } = useLive();
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    api.categories().then((c) => { setCategories(c); setError(null); }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { reload(); }, [reload, version]);
  return { categories, error, reload };
}
