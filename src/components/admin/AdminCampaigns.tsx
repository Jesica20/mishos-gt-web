import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Calendar, MapPin, Clock, Users, Edit, Trash2, Ban, AlertTriangle, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { callFn } from '@/lib/callFn';

interface Campaign {
  id: string;
  title: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  max_appointments: number;
  description: string | null;
  image_url: string | null;
  created_at: string;
  is_active?: boolean;
}

export const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({});
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const filtered = campaigns.filter(campaign =>
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCampaigns(filtered);
  }, [campaigns, searchTerm]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);

      // [Cambio #1] — Listar campañas vía Edge Function (incluye conteos)
      const data = await callFn('admin-campaigns', { action: 'list' })

      const list = (data?.campaigns ?? []) as Array<any>;
      setCampaigns(list);

      const counts: Record<string, number> = {};
      list.forEach((c: any) => { counts[c.id] = Number(c.appointment_count || 0); });
      setAppointmentCounts(counts);

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las jornadas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCreateImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCreateImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCreateImage = () => {
    setCreateImageFile(null);
    setCreateImagePreview(null);
  };

  const removeEditImage = () => {
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const uploadImage = async (file: File, folder: string = 'campaigns'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const location = formData.get('location') as string;
    const date = formData.get('date') as string;
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;
    const max_appointments = parseInt(formData.get('max_appointments') as string);
    const description = formData.get('description') as string;

    try {
      let image_url = null;
      
      // Subida a Storage se mantiene igual
      if (createImageFile) {
        image_url = await uploadImage(createImageFile);
        if (!image_url) {
          throw new Error('Error uploading image');
        }
      }

      // [Cambio #2] — Crear campaña vía Edge Function
      await callFn('admin-campaigns', {
          action: 'create',
          payload: {
            title,
            location,
            date,
            start_time,
            end_time,
            max_appointments,
            description: description || null,
            image_url,
          }
        });

      toast({
        title: "Jornada creada",
        description: "La jornada de castración ha sido creada exitosamente.",
      });
      
      (e.target as HTMLFormElement).reset();
      setCreateImageFile(null);
      setCreateImagePreview(null);
      setIsDialogOpen(false);
      fetchCampaigns();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la jornada.",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditImagePreview(campaign.image_url);
    setEditImageFile(null);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCampaign) return;
    
    setEditLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const location = formData.get('location') as string;
    const date = formData.get('date') as string;
    const start_time = formData.get('start_time') as string;
    const end_time = formData.get('end_time') as string;
    const max_appointments = parseInt(formData.get('max_appointments') as string);
    const description = formData.get('description') as string;

    try {
      let image_url = editingCampaign.image_url;
      
      if (editImageFile) {
        const newImageUrl = await uploadImage(editImageFile);
        if (newImageUrl) {
          image_url = newImageUrl;
        }
      } else if (!editImagePreview) {
        image_url = null;
      }

      // [Cambio #3] — Actualizar campaña vía Edge Function
      await callFn('admin-campaigns', {
          action: 'update',
          payload: {
            id: editingCampaign.id,
            title,
            location,
            date,
            start_time,
            end_time,
            max_appointments,
            description: description || null,
            image_url,
          }
        });

      toast({
        title: "Jornada actualizada",
        description: "La jornada de castración ha sido actualizada exitosamente.",
      });
      
      setIsEditDialogOpen(false);
      setEditingCampaign(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      fetchCampaigns();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la jornada.",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    try {
      const appointmentCount = appointmentCounts[campaignId] || 0;
      if (appointmentCount > 0) {
        toast({
          title: "No se puede eliminar",
          description: `Esta jornada tiene ${appointmentCount} cita(s) programada(s). No se puede eliminar.`,
          variant: "destructive",
        });
        return;
      }

      // [Cambio #4] — Eliminar campaña vía Edge Function
      await callFn('admin-campaigns', { action: 'delete', payload: { id: campaignId }});

      toast({
        title: "Jornada eliminada",
        description: "La jornada de castración ha sido eliminada exitosamente.",
      });
      
      fetchCampaigns();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la jornada.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPastCampaign = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando jornadas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and create button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por título o ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Jornada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Jornada</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" name="title" placeholder="Título de la jornada" required />
                </div>
                <div>
                  <Label htmlFor="location">Ubicación *</Label>
                  <Input id="location" name="location" placeholder="Lugar de la jornada" required />
                </div>
                <div>
                  <Label htmlFor="date">Fecha *</Label>
                  <Input id="date" name="date" type="date" required />
                </div>
                <div>
                  <Label htmlFor="max_appointments">Máximo de citas *</Label>
                  <Input id="max_appointments" name="max_appointments" type="number" min="1" defaultValue="20" required />
                </div>
                <div>
                  <Label htmlFor="start_time">Hora de inicio *</Label>
                  <Input id="start_time" name="start_time" type="time" required />
                </div>
                <div>
                  <Label htmlFor="end_time">Hora de fin *</Label>
                  <Input id="end_time" name="end_time" type="time" required />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" placeholder="Descripción de la jornada..." rows={3} />
              </div>
              
              {/* Image Upload */}
              <div>
                <Label>Imagen de la jornada</Label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('create-image-input')?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Seleccionar imagen
                    </Button>
                    <input
                      id="create-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleCreateImageChange}
                      className="hidden"
                    />
                  </div>
                  
                  {createImagePreview && (
                    <div className="relative w-full max-w-sm">
                      <img
                        src={createImagePreview}
                        alt="Vista previa"
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeCreateImage}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createLoading} className="flex-1">
                  {createLoading ? 'Creando...' : 'Crear Jornada'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Jornada</DialogTitle>
            </DialogHeader>
            {editingCampaign && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-title">Título *</Label>
                    <Input id="edit-title" name="title" defaultValue={editingCampaign.title} placeholder="Título de la jornada" required />
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Ubicación *</Label>
                    <Input id="edit-location" name="location" defaultValue={editingCampaign.location} placeholder="Lugar de la jornada" required />
                  </div>
                  <div>
                    <Label htmlFor="edit-date">Fecha *</Label>
                    <Input id="edit-date" name="date" type="date" defaultValue={editingCampaign.date} required />
                  </div>
                  <div>
                    <Label htmlFor="edit-max_appointments">Máximo de citas *</Label>
                    <Input id="edit-max_appointments" name="max_appointments" type="number" min="1" defaultValue={editingCampaign.max_appointments} required />
                  </div>
                  <div>
                    <Label htmlFor="edit-start_time">Hora de inicio *</Label>
                    <Input id="edit-start_time" name="start_time" type="time" defaultValue={editingCampaign.start_time} required />
                  </div>
                  <div>
                    <Label htmlFor="edit-end_time">Hora de fin *</Label>
                    <Input id="edit-end_time" name="end_time" type="time" defaultValue={editingCampaign.end_time} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Textarea id="edit-description" name="description" defaultValue={editingCampaign.description || ''} placeholder="Descripción de la jornada..." rows={3} />
                </div>
                
                {/* Image Upload */}
                <div>
                  <Label>Imagen de la jornada</Label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('edit-image-input')?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {editImagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                      </Button>
                      <input
                        id="edit-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        className="hidden"
                      />
                      {editImagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeEditImage}
                          className="flex items-center gap-2"
                        >
                          <X className="w-3 h-3" />
                          Quitar imagen
                        </Button>
                      )}
                    </div>
                    
                    {editImagePreview && (
                      <div className="w-full max-w-sm">
                        <img
                          src={editImagePreview}
                          alt="Vista previa"
                          className="w-full h-32 object-cover rounded-md border"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={editLoading}>
                    {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns list */}
      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>Jornadas de Castración ({filteredCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron jornadas con esa búsqueda.' : 'No hay jornadas registradas.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Citas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{campaign.title}</p>
                          {campaign.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {campaign.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(campaign.date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatTime(campaign.start_time)} - {formatTime(campaign.end_time)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{campaign.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {appointmentCounts[campaign.id] || 0} / {campaign.max_appointments}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isPastCampaign(campaign.date) ? "secondary" : "default"}>
                          {isPastCampaign(campaign.date) ? 'Finalizada' : 'Activa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(campaign)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar jornada?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente la jornada de castración.
                                  {appointmentCounts[campaign.id] > 0 && (
                                    <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive">
                                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                                      Esta jornada tiene {appointmentCounts[campaign.id]} cita(s) programada(s).
                                    </div>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(campaign.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};