import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Calendar, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Donation {
  id: string;
  description: string;
  date: string;
  image_url?: string;
  created_at: string;
}

const Donations = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching donations:', error);
      } else {
        setDonations(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
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
          <Heart className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
          Historial de Donaciones
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Conoce todas las donaciones que la comunidad ha realizado para apoyar a nuestros animales
        </p>
      </div>

      {/* Donations Grid */}
      {donations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No hay donaciones registradas</h3>
          <p className="text-muted-foreground">
            Las donaciones aparecerán aquí cuando sean registradas por los administradores
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {donations.map((donation, index) => (
            <Card 
              key={donation.id} 
              className="shadow-soft hover:shadow-warm transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">
                    {donation.description}
                  </CardTitle>
                  <Badge variant="secondary" className="ml-2 flex-shrink-0">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(donation.date), 'dd MMM', { locale: es })}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Image */}
                {donation.image_url ? (
                  <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={donation.image_url}
                      alt="Donación"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-video mb-4 rounded-lg bg-gradient-soft flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {format(new Date(donation.date), 'dd \'de\' MMMM, yyyy', { locale: es })}
                  </span>
                  <span>
                    Publicado {format(new Date(donation.created_at), 'dd/MM/yy', { locale: es })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Call to Action */}
      <div className="text-center mt-16 p-8 bg-gradient-soft rounded-2xl">
        <h2 className="text-2xl font-bold mb-4">¿Quieres ayudar?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Tu apoyo es fundamental para continuar cuidando a los animales que más lo necesitan. 
          Cada donación, sin importar su tamaño, hace la diferencia.
        </p>
        <div className="flex flex-wrap gap-2 justify-center text-sm text-muted-foreground">
          <span className="bg-card px-3 py-1 rounded-full">Alimento</span>
          <span className="bg-card px-3 py-1 rounded-full">Medicinas</span>
          <span className="bg-card px-3 py-1 rounded-full">Cuidado veterinario</span>
          <span className="bg-card px-3 py-1 rounded-full">Refugio</span>
        </div>
      </div>
    </div>
  );
};

export default Donations;