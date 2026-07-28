import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Route, Stop, StopArrival } from '@transitflow/types';
import { api } from '../lib/api';
import { colors } from '../theme';

function formatEta(seconds: number): string {
  if (seconds < 45) return 'Now';
  return `${Math.round(seconds / 60)} min`;
}

export function StopsScreen() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [arrivals, setArrivals] = useState<StopArrival[]>([]);

  useEffect(() => {
    Promise.all([api.stops(), api.routes()])
      .then(([s, r]) => {
        setStops(s);
        setRoutes(r);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedStopId) {
      setArrivals([]);
      return;
    }
    let cancelled = false;
    const load = () => api.arrivals(selectedStopId).then((a) => !cancelled && setArrivals(a));
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedStopId]);

  const routeById = new Map(routes.map((r) => [r.id, r]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={stops}
      keyExtractor={(s) => s.id}
      renderItem={({ item: stop }) => (
        <View>
          <Pressable
            style={styles.row}
            onPress={() => setSelectedStopId((prev) => (prev === stop.id ? null : stop.id))}
          >
            <Text style={styles.stopName}>{stop.name}</Text>
          </Pressable>
          {selectedStopId === stop.id && (
            <View style={styles.arrivals}>
              {arrivals.length === 0 && <Text style={styles.muted}>No upcoming arrivals</Text>}
              {arrivals.map((a) => {
                const route = routeById.get(a.routeId);
                return (
                  <View key={a.vehicleId} style={styles.arrivalRow}>
                    <View style={[styles.badge, { backgroundColor: route?.color ?? colors.primary }]}>
                      <Text style={styles.badgeText}>{route?.shortName ?? '?'}</Text>
                    </View>
                    <Text style={styles.eta}>{formatEta(a.etaSeconds)}</Text>
                    <Text style={styles.muted}>{a.confidence}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { flex: 1, backgroundColor: colors.bg },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  stopName: { fontSize: 15, color: colors.text },
  arrivals: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  arrivalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  eta: { fontWeight: '700', color: colors.text, width: 56 },
  muted: { color: colors.textMuted, fontSize: 12 },
});
