import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Heart, Calendar, Users, UserPlus, ImageIcon, FileImage } from 'lucide-react';
import { AdminDonations } from '@/components/admin/AdminDonations';
import { AdminCampaigns } from '@/components/admin/AdminCampaigns';
import { AdminAppointments } from '@/components/admin/AdminAppointments';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminGallery } from '@/components/admin/AdminGallery';
import { AdminRecommendations } from '@/components/admin/AdminRecommendations';

const Admin = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b shadow-soft">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 sm:h-16">
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gradient">Panel de Administración</h1>
              <p className="text-sm text-muted-foreground">Mishos GT</p>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <Tabs defaultValue="donations" className="w-full">
          <div className="mb-6 sm:mb-8">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 h-auto p-1">
              <TabsTrigger value="donations" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
                <Heart className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Donaciones</span>
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Jornadas</span>
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Citas</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
                <UserPlus className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Usuarios</span>
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
                <ImageIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Galería</span>
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
                <FileImage className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Recomendaciones</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="donations">
            <AdminDonations />
          </TabsContent>

          <TabsContent value="campaigns">
            <AdminCampaigns />
          </TabsContent>

          <TabsContent value="appointments">
            <AdminAppointments />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="gallery">
            <AdminGallery />
          </TabsContent>

          <TabsContent value="recommendations">
            <AdminRecommendations />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;