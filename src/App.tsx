import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { JoinGate } from './components/JoinGate';
import { TripView } from './components/TripView';
import { extractToken } from './lib/share';

type Route = { view: 'home' } | { view: 'trip'; id: string } | { view: 'join'; token: string };

export default function App() {
  const [route, setRoute] = useState<Route>(() => {
    const token = extractToken(location.hash);
    return token ? { view: 'join', token } : { view: 'home' };
  });

  useEffect(() => {
    const onHashChange = () => {
      const token = extractToken(location.hash);
      if (token) setRoute({ view: 'join', token });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const clearHash = () => history.replaceState(null, '', location.pathname + location.search);

  switch (route.view) {
    case 'home':
      return (
        <Home
          onOpenTrip={(id) => setRoute({ view: 'trip', id })}
          onJoinToken={(token) => setRoute({ view: 'join', token })}
        />
      );
    case 'join':
      return (
        <JoinGate
          token={route.token}
          onDone={(id) => {
            clearHash();
            setRoute({ view: 'trip', id });
          }}
          onCancel={() => {
            clearHash();
            setRoute({ view: 'home' });
          }}
        />
      );
    case 'trip':
      return <TripView key={route.id} tripId={route.id} onBack={() => setRoute({ view: 'home' })} />;
  }
}
