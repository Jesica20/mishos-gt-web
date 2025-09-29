import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, PawPrint, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Appointment {
  id: string;
  pet_name: string;
  pet_size: string;
  owner_first_name: string;
  owner_last_name: string;
  appointment_time: string;
  campaign: {
    title: string;
    date: string;    // asume 'YYYY-MM-DD'
    location: string;
  } | null;
}

export const AdminAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyActiveCampaigns, setOnlyActiveCampaigns] = useState(true); // activo por defecto

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          campaign:castration_campaigns(title, date, location)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments((data as Appointment[]) || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: campaña activa si la fecha es hoy o futuro
  const isActiveCampaign = (dateStr?: string | null) => {
    if (!dateStr) return false;
    // Comparación segura por fecha (interpretando YYYY-MM-DD en local)
    const d = new Date(dateStr);
    const today = new Date();
    // normaliza a medianoche para comparar solo fecha
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return d >= today;
  };

  // Filtrado memoizado
  const filteredAppointments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return appointments.filter(appt => {
      // 1) filtro por activas (si aplica)
      if (onlyActiveCampaigns && !isActiveCampaign(appt.campaign?.date)) {
        return false;
      }

      // 2) filtro por texto (en nombre de mascota, dueño, campaña, ubicación)
      if (!term) return true;

      const hay = [
        appt.pet_name,
        appt.pet_size,
        appt.owner_first_name,
        appt.owner_last_name,
        appt.campaign?.title,
        appt.campaign?.location,
        appt.campaign?.date,
        appt.appointment_time,
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term));

      return hay;
    });
  }, [appointments, searchTerm, onlyActiveCampaigns]);

  if (loading) {
    return <div className="text-center py-8">Cargando citas...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Citas Agendadas</h2>

      {/* Controles de filtro */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Búsqueda */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar (mascota, dueño, jornada, ubicación, fecha, hora)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Toggle Solo activas */}
        <div className="flex items-center gap-3">
          <Switch
            id="switch-activas"
            checked={onlyActiveCampaigns}
            onCheckedChange={setOnlyActiveCampaigns}
          />
          <Label htmlFor="switch-activas" className="cursor-pointer">
            Solo jornadas activas
          </Label>
        </div>
      </div>

      {/* Lista */}
      {filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm || onlyActiveCampaigns
                ? 'No hay citas que coincidan con los filtros.'
                : 'No hay citas agendadas.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PawPrint className="w-5 h-5" />
                    <span>{appointment.pet_name}</span>
                  </div>

                  {/* Muestra si la jornada está activa o finalizada */}
                  <Badge variant={isActiveCampaign(appointment.campaign?.date) ? 'default' : 'secondary'}>
                    {isActiveCampaign(appointment.campaign?.date) ? 'Jornada activa' : 'Jornada finalizada'}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{appointment.owner_first_name} {appointment.owner_last_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{appointment.appointment_time}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{appointment.campaign?.date}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {appointment.campaign?.location}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};