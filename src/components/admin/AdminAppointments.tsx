import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, PawPrint, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Appointment {
  id: string;
  pet_name: string;
  pet_size: string;
  pet_weight: string;
  pet_breed: string;
  pet_allergies: string;
  pet_age: string;
  medical_complications: string;
  vaccinations: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_id: string;
  appointment_time: string; // HH:mm[:ss]
  campaign: {
    title: string;
    date: string; // YYYY-MM-DD
    location: string;
  } | null;
}

export const AdminAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyActiveCampaigns, setOnlyActiveCampaigns] = useState(true); // activo por defecto

  // modal de detalle
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);

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
    const d = new Date(dateStr);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return d >= today;
  };

  const formatTime = (t?: string) =>
    t ? new Date(`2000-01-01T${t}`).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  // Filtrado memoizado
  const filteredAppointments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return appointments.filter(appt => {
      // 1) filtro por activas (si aplica)
      if (onlyActiveCampaigns && !isActiveCampaign(appt.campaign?.date)) {
        return false;
      }

      // 2) filtro por texto
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

                  <div className="flex items-center gap-2">
                    <Badge variant={isActiveCampaign(appointment.campaign?.date) ? 'default' : 'secondary'}>
                      {isActiveCampaign(appointment.campaign?.date) ? 'Jornada activa' : 'Jornada finalizada'}
                    </Badge>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(appointment);
                        setIsViewOpen(true);
                      }}
                    >
                      Ver
                    </Button>
                  </div>
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
                      <span>{formatTime(appointment.appointment_time)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(appointment.campaign?.date)}</span>
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

      {/* Modal de detalle (solo lectura) */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de la cita</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Mascota</p>
                <p className="font-medium">{selected.pet_name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Peso</p>
                  <p className="font-medium">{selected.pet_weight}</p>
                </div>
                <div>
                <p className="text-muted-foreground">Edad</p>
                <p className="font-medium">{selected.pet_age}</p>
              </div>

              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Tamaño</p>
                  <p className="font-medium">{selected.pet_size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hora</p>
                  <p className="font-medium">{formatTime(selected.appointment_time)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Raza</p>
                  <p className="font-medium">
                    {selected?.pet_breed}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Alergias</p>
                  <p className="font-medium">
                    {selected?.pet_allergies}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Complicaciones Medicas</p>
                  <p className="font-medium">
                    {selected?.medical_complications}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vacunas</p>
                  <p className="font-medium">
                    {selected?.vaccinations}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Dueño</p>
                  <p className="font-medium">
                    {selected.owner_first_name} {selected.owner_last_name}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">DPI</p>
                  <p className="font-medium">
                    {selected.owner_id}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado de jornada</p>
                  <p className="font-medium">
                    {isActiveCampaign(selected.campaign?.date) ? 'Jornada activa' : 'Jornada finalizada'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-muted-foreground">Jornada</p>
                  <p className="font-medium">{selected.campaign?.title || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Fecha</p>
                    <p className="font-medium">{formatDate(selected.campaign?.date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ubicación</p>
                    <p className="font-medium">{selected.campaign?.location || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsViewOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};