import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Calendar, PawPrint, MapPin, Clock, Phone } from 'lucide-react';
import MichosLogo from '../assets/michos.svg';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center bg-gradient-warm">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-foreground/20 rounded-full mb-6 animate-float">
              <img src={MichosLogo} width={100} alt="mishos-logo" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground mb-6">
              Mishos GT
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Asociación dedicada al cuidado y bienestar de perros y gatos en Guatemala
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/donations">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto shadow-soft" data-testid="cta-donations">
                <Heart className="w-5 h-5 mr-2" />
                Ver Donaciones
              </Button>
            </Link>
            <Link to="/castrations">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20" data-testid="cta-castrations">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Castración
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nuestros Servicios</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Trabajamos incansablemente para brindar cuidado médico y encontrar hogares amorosos para nuestros amigos de cuatro patas
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Donations Card */}
            <Card className="shadow-soft hover:shadow-warm transition-all duration-300 animate-float">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-warm rounded-lg flex items-center justify-center">
                    <Heart className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Donaciones</CardTitle>
                    <CardDescription>Historial de apoyo comunitario</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Conoce cómo la comunidad ha apoyado a nuestros animales con donaciones de alimento, medicinas y cuidados veterinarios.
                </p>
                <Link to="/donations">
                  <Button variant="outline" className="w-full">
                    Ver todas las donaciones
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Castrations Card */}
            <Card className="shadow-soft hover:shadow-warm transition-all duration-300 animate-float" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-warm rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Jornadas de Castración</CardTitle>
                    <CardDescription>Citas disponibles por ubicación</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Agenda una cita para la castración de tu mascota en nuestras jornadas organizadas en diferentes ubicaciones.
                </p>
                <Link to="/castrations">
                  <Button variant="outline" className="w-full">
                    Agendar cita
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Por qué castrar a tu mascota?</h2>
            <p className="text-lg text-muted-foreground">
              La castración es un acto de amor y responsabilidad
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-soft">
                <Heart className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Salud</h3>
              <p className="text-muted-foreground text-sm">
                Previene enfermedades reproductivas y reduce el riesgo de ciertos tipos de cáncer
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-soft" style={{ animationDelay: '0.3s' }}>
                <PawPrint className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Control Poblacional</h3>
              <p className="text-muted-foreground text-sm">
                Ayuda a controlar la sobrepoblación de animales en situación de calle
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-soft" style={{ animationDelay: '0.6s' }}>
                <MapPin className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Comportamiento</h3>
              <p className="text-muted-foreground text-sm">
                Mejora el comportamiento y reduce la agresividad y territorialidad
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">¿Necesitas más información?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Estamos aquí para ayudarte y responder todas tus preguntas sobre nuestros servicios
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Phone className="w-5 h-5" />
              <span>+502 41142650</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span>Lun - Vie: 8:00 AM - 5:00 PM</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;