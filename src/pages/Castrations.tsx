import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users, PawPrint, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentModal } from '@/components/AppointmentModal';
import { Gallery } from '@/components/Gallery';
import { PreviewDialog } from '@/components/PreviewDialog';

interface Campaign {
  id: string;
  title: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  max_appointments: number;
  description?: string;
  image_url?: string;
  appointments_count?: number;
}

const Castrations = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      // First, fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('castration_campaigns')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        return;
      }

      // Then, fetch appointment counts using secure function
      const campaignIds = campaignsData?.map(c => c.id) || [];
      const { data: countsData, error: countsError } = await supabase
        .rpc('get_appointment_counts', { _campaign_ids: campaignIds });

      if (countsError) {
        console.error('Error fetching appointment counts:', countsError);
        // Fallback to 0 counts if function fails
        const campaignsWithCount = campaignsData?.map(campaign => ({
          ...campaign,
          appointments_count: 0
        })) || [];
        setCampaigns(campaignsWithCount);
        return;
      }

      // Merge campaigns with their counts
      const countsMap = new Map(countsData?.map(c => [c.campaign_id, c.total]) || []);
      const campaignsWithCount = campaignsData?.map(campaign => ({
        ...campaign,
        appointments_count: countsMap.get(campaign.id) || 0
      })) || [];
      setCampaigns(campaignsWithCount);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAppointment = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleAppointmentSuccess = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
    fetchCampaigns(); // Refresh to update appointment counts
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded mb-4"></div>
                <div className="h-8 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-warm rounded-full mb-6 animate-float">
          <Calendar className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
          Jornadas de Castración
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Agenda una cita para la castración de tu mascota en nuestras jornadas programadas
        </p>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No hay jornadas programadas</h3>
          <p className="text-muted-foreground">
            Las próximas jornadas de castración aparecerán aquí cuando sean programadas
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign, index) => {
            const isFullyBooked = campaign.appointments_count >= campaign.max_appointments;
            const availableSlots = campaign.max_appointments - campaign.appointments_count;
            return (
              <Card
                key={campaign.id}
                className="shadow-soft hover:shadow-warm transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {campaign.title}
                    </CardTitle>
                    <Badge
                      variant={isFullyBooked ? "destructive" : "secondary"}
                      className="ml-2 flex-shrink-0"
                    >
                      {isFullyBooked ? "Completo" : `${availableSlots} disponibles`}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {campaign.location}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {format(new Date(campaign.date), 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {campaign.start_time} - {campaign.end_time}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {campaign.appointments_count} / {campaign.max_appointments} citas
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Image */}
                  {campaign.image_url ? (
                    <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-muted">
                      <PreviewDialog
                        url={campaign.image_url}
                        title={campaign.title}
                        isPDF={false}
                        trigger={
                          // Toda esta miniatura es clickable/touchable
                          <button
                            type="button"
                            className="group w-full h-full relative cursor-zoom-in focus:outline-none"
                            aria-label={`Ver imagen ${campaign.title}`}
                          >
                            <img
                              src={campaign.image_url}
                              alt={campaign.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-[1.01]"
                            />
                            {/* Overlay sutil para indicar que se puede abrir */}
                            <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </button>
                        }
                      />
                    </div>
                  ) : (
                    <div className="aspect-video mb-4 rounded-lg bg-gradient-soft flex items-center justify-center">
                      <PawPrint className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* Description */}
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}

                  {/* Action Button */}
                  <Button
                    onClick={() => handleScheduleAppointment(campaign)}
                    disabled={isFullyBooked}
                    className="w-full bg-gradient-warm hover:opacity-90"
                  >
                    {isFullyBooked ? 'Jornada completa' : 'Agendar cita'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Information Section */}
      <div className="mt-16 p-8 bg-gradient-soft rounded-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">Preparación para la castración</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Requisitos importantes:</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Ayuno de 12 horas antes de la cirugía</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Mascota debe estar sana (sin resfriados o heridas)</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Traer identificación del propietario</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Llevar una manta o toalla para el transporte</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">¿Qué incluye el servicio?</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Cirugía de castración completa</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Anestesia y monitoreo durante la cirugía</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Medicamentos post-operatorios</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Seguimiento post-quirúrgico</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="mt-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-warm rounded-full mb-4">
            <ImageIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gradient">Galería</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Fotos de nuestras jornadas de castración y el impacto positivo en la comunidad
          </p>
        </div>
        <Gallery />
      </div>

      {/* Appointment Modal */}
      {selectedCampaign && (
        <AppointmentModal
          campaign={selectedCampaign}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleAppointmentSuccess}
        />
      )}
    </div>
  );
};

export default Castrations;