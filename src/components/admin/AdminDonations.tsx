import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Calendar, Heart, Edit, Trash2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { callFn } from '@/lib/callFn';

interface Donation {
  id: string;
  description: string;
  date: string;
  image_url: string | null;
  created_at: string;
}

export const AdminDonations = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchDonations();
  }, []);

  useEffect(() => {
    const filtered = donations.filter(donation =>
      donation.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDonations(filtered);
  }, [donations, searchTerm]);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const { data, error } = await callFn<Donation[]>(
        'admin-donations',
        { action: 'list', search: searchTerm || undefined, page: 1, pageSize: 100 }
      );
      if (error) throw error;
      setDonations(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las donaciones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadImageIfNeeded = async (file: File | null): Promise<string | null> => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `donations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return publicUrl ?? null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);

    const formData = new FormData(e.currentTarget);
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;

    try {
      const imageUrl = await uploadImageIfNeeded(selectedImage);

      const { error } = await callFn('admin-donations', {
        action: 'create',
        description,
        date,           // debe ser YYYY-MM-DD
        image_url: imageUrl,
      });
      if (error) throw error;

      toast({ title: "Donación registrada", description: "La donación ha sido registrada exitosamente." });
      
      (e.target as HTMLFormElement).reset();
      setIsDialogOpen(false);
      setSelectedImage(null);
      setImagePreview(null);
      fetchDonations();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la donación.",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleEdit = (donation: Donation) => {
    setEditingDonation(donation);
    setIsEditDialogOpen(true);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDonation) return;

    setUpdateLoading(true);

    const formData = new FormData(e.currentTarget);
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;

    try {
      let imageUrl = editingDonation.image_url;
      if (selectedImage) {
        imageUrl = await uploadImageIfNeeded(selectedImage);
      }

      const { error } = await callFn('admin-donations', {
        action: 'update',
        id: editingDonation.id,
        description,
        date,
        image_url: imageUrl ?? null,
      });
      if (error) throw error;

      toast({ title: "Donación actualizada", description: "La donación ha sido actualizada exitosamente." });
      
      setIsEditDialogOpen(false);
      setEditingDonation(null);
      setSelectedImage(null);
      setImagePreview(null);
      fetchDonations();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la donación.",
        variant: "destructive",
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (donationId: string) => {
    setDeleteLoading(donationId);
    try {
      const { error } = await callFn('admin-donations', { action: 'delete', id: donationId });
      if (error) throw error;

      toast({ title: "Donación eliminada", description: "La donación ha sido eliminada exitosamente." });
      fetchDonations();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la donación.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const tomorrow = new Date(dateStr);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando donaciones...</p>
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
            placeholder="Buscar en descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Donación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Donación</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Textarea id="description" name="description" placeholder="Describe la donación recibida..." required rows={4} />
              </div>
              <div>
                <Label htmlFor="date">Fecha *</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div>
                <Label htmlFor="image">Imagen</Label>
                <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
                {imagePreview && (
                  <div className="mt-2">
                    <img src={imagePreview} alt="Vista previa" className="w-full h-32 object-cover rounded-md" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setIsDialogOpen(false); setSelectedImage(null); setImagePreview(null); }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createLoading} className="flex-1">
                  {createLoading ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Donations list */}
      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>Donaciones Recibidas ({filteredDonations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDonations.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron donaciones con esa búsqueda.' : 'No hay donaciones registradas.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagen</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Registrado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell className="w-20">
                        {donation.image_url ? (
                          <img src={donation.image_url} alt="Donación" className="w-16 h-16 object-cover rounded-md" />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm leading-relaxed break-words">{donation.description}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(donation.date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(donation.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(donation)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={deleteLoading === donation.id}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar donación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. La donación será eliminada permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(donation.id)}
                                  disabled={deleteLoading === donation.id}
                                >
                                  {deleteLoading === donation.id ? 'Eliminando...' : 'Eliminar'}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Donación</DialogTitle>
          </DialogHeader>
          {editingDonation && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-description">Descripción *</Label>
                <Textarea id="edit-description" name="description" defaultValue={editingDonation.description} required rows={4} />
              </div>
              <div>
                <Label htmlFor="edit-date">Fecha *</Label>
                <Input id="edit-date" name="date" type="date" defaultValue={editingDonation.date} required />
              </div>
              <div>
                <Label htmlFor="edit-image">Imagen</Label>
                <Input id="edit-image" name="image" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
                {editingDonation.image_url && !imagePreview && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Imagen actual:</p>
                    <img src={editingDonation.image_url} alt="Imagen actual" className="w-full h-32 object-cover rounded-md" />
                  </div>
                )}
                {imagePreview && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Nueva imagen:</p>
                    <img src={imagePreview} alt="Vista previa" className="w-full h-32 object-cover rounded-md" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setIsEditDialogOpen(false); setEditingDonation(null); setSelectedImage(null); setImagePreview(null); }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateLoading} className="flex-1">
                  {updateLoading ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};