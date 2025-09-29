import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Image as ImageIcon, Trash2, Search, Upload, X, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { callFn } from '@/lib/callFn';
import { PreviewDialog } from '../PreviewDialog';

interface GalleryPhoto {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  created_at: string;
  created_by?: string;
}

interface UploadingFile {
  file: File;
  title: string;
  description: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  id: string;
}

export const AdminGallery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for single photo
  const [newPhoto, setNewPhoto] = useState({
    title: '',
    description: '',
    image_url: ''
  });

  useEffect(() => {
    fetchPhotos();
  }, []);

  useEffect(() => {
    const filtered = photos.filter(photo =>
      photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (photo.description && photo.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredPhotos(filtered);
  }, [searchTerm, photos]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await callFn<{ id: string }[]>(
        'admin-gallery',
        { action: 'list', search: searchTerm || undefined, page: 1, pageSize: 100 }
      );
      if (error) throw error;
      setPhotos((data as any[]) ?? []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las fotos de la galería",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `gallery/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // const handleBulkUpload = async (files: File[]) => {
  // if (!user) {
  // toast({
  // title: "Error",
  // description: "Debes estar autenticado para subir fotos",
  // variant: "destructive"
  // });
  // return;
  // }

  // let uploadingFilesVal: UploadingFile[] = files.map(file => ({
  // file,
  // title: file.name.replace(/\.[^/.]+$/, ""),
  // description: '',
  // progress: 0,
  // status: 'uploading',
  // id: Math.random().toString(36).substr(2, 9)
  // }));

  // setUploadingFiles(uploadingFilesVal);
  // setIsUploading(true);

  // for (let i = 0; i < uploadingFilesVal.length; i++) {
  // const item = uploadingFilesVal[i];
  // try {
  // // 25%
  // uploadingFilesVal = uploadingFilesVal.map(f => f.id === item.id ? { ...f, progress: 25 } : f);
  // setUploadingFiles(uploadingFilesVal);

  // // subir imagen
  // const imageUrl = await handleImageUpload(item.file);

  // // 75%
  // uploadingFilesVal = uploadingFilesVal.map(f => f.id === item.id ? { ...f, progress: 75 } : f);
  // setUploadingFiles(uploadingFilesVal);

  // // crear fila (Edge Function)
  // const { error } = await callFn(
  // 'admin-gallery',
  // { action: 'create', title: item.title, description: item.description, image_url: imageUrl }
  // );
  // if (error) throw error;

  // // 100%
  // uploadingFilesVal = uploadingFilesVal.map(f => f.id === item.id ? { ...f, progress: 100, status: 'success' } : f);
  // setUploadingFiles(uploadingFilesVal);
  // } catch (err) {
  // console.error('Error uploading file:', err);
  // uploadingFilesVal = uploadingFilesVal.map(f => f.id === item.id ? { ...f, status: 'error' } : f);
  // setUploadingFiles(uploadingFilesVal);
  // }
  // }

  // const successful = uploadingFilesVal.filter(f => f.status === 'success').length;
  // toast({
  // title: successful > 0 ? "Éxito" : "Error",
  // description: `Se subieron ${successful} de ${files.length} fotos correctamente`,
  // variant: successful === files.length ? "default" : "destructive"
  // });

  // // setTimeout(() => {
  // // setUploadingFiles([]);
  // // setIsUploading(false);
  // // fetchPhotos();
  // // }, 800);
  // };

  const handleBulkUpload = async (files: File[]) => {
    if (!user) {
      toast({ title: "Error", description: "Debes estar autenticado para subir fotos", variant: "destructive" });
      return;
    }

    const pendingItems: UploadingFile[] = files.map(file => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      description: '',
      progress: 0,
      status: 'pending',
      id: Math.random().toString(36).slice(2, 11),
    }));

    setUploadingFiles(prev => [...prev, ...pendingItems]);
    setIsUploading(false); // aún no subimos
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) handleBulkUpload(files);
  };

  const handleMultipleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) handleBulkUpload(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateUploadingFile = (id: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Error", description: "Debes estar autenticado para crear fotos", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await callFn('admin-gallery', {
        action: 'create',
        title: newPhoto.title,
        description: newPhoto.description,
        image_url: newPhoto.image_url
      });
      if (error) throw error;

      toast({ title: "Éxito", description: "Foto agregada a la galería correctamente" });
      setNewPhoto({ title: '', description: '', image_url: '' });
      setIsCreateDialogOpen(false);
      fetchPhotos();
    } catch (error) {
      console.error('Error creating photo:', error);
      toast({ title: "Error", description: "No se pudo agregar la foto", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const imageUrl = await handleImageUpload(file);
      if (imageUrl) setNewPhoto(prev => ({ ...prev, image_url: imageUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await callFn('admin-gallery', { action: 'delete', id });
      if (error) throw error;

      toast({ title: "Éxito", description: "Foto eliminada correctamente" });
      fetchPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({ title: "Error", description: "No se pudo eliminar la foto", variant: "destructive" });
    }
  };

  const handleEdit = (photo: GalleryPhoto) => {
    setEditingPhoto(photo);
    setIsEditDialogOpen(true);
  };

  const uploadOne = async (item: UploadingFile) => {
    try {
      updateUploadingFile(item.id, { status: 'uploading', progress: 10 });

      // 1) subir imagen
      const imageUrl = await handleImageUpload(item.file);
      updateUploadingFile(item.id, { progress: 70 });

      // 2) crear fila en BD usando el título/descr. ya editados por el usuario
      const { error } = await callFn('admin-gallery', {
        action: 'create',
        title: item.title,
        description: item.description,
        image_url: imageUrl,
      });
      if (error) throw error;

      updateUploadingFile(item.id, { progress: 100, status: 'success' });
    } catch (err) {
      console.error('Error uploading file:', err);
      updateUploadingFile(item.id, { status: 'error' });
    }
  };

  const confirmUpload = async () => {
    const items = [...uploadingFiles]; // snapshot
    setIsUploading(true);

    for (const item of items) {
      if (item.status === 'pending' || item.status === 'error') {
        await uploadOne(item);
      }
    }

    // toast({
    // title: successful > 0 ? "Éxito" : "Error",
    // description: `Se subieron ${successful} de ${items.length} fotos correctamente`,
    // variant: successful === items.length ? "default" : "destructive",
    // });

    toast({
      title: "Éxito",
      description: `Se subieron ${items.length} de ${items.length} fotos correctamente`,
      variant: "default"
    });

    // Limpia UI y refresca lista
    setUploadingFiles([]);
    setIsUploading(false);
    fetchPhotos();
  };

  const handleUpdatePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto || !user) {
      toast({ title: "Error", description: "No se pudo actualizar la foto", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await callFn('admin-gallery', {
        action: 'update',
        id: editingPhoto.id,
        title: editingPhoto.title,
        description: editingPhoto.description ?? null
      });
      if (error) throw error;

      toast({ title: "Éxito", description: "Foto actualizada correctamente" });
      setEditingPhoto(null);
      setIsEditDialogOpen(false);
      fetchPhotos();
    } catch (error) {
      console.error('Error updating photo:', error);
      toast({ title: "Error", description: "No se pudo actualizar la foto", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando galería...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Galería de Fotos</h2>
          <p className="text-muted-foreground">
            Gestiona las fotos que aparecen en la galería de castraciones
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Foto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Nueva Foto</DialogTitle>
              <DialogDescription>
                Agrega una nueva foto a la galería de castraciones
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newPhoto.title}
                  onChange={(e) => setNewPhoto(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título de la foto"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={newPhoto.description}
                  onChange={(e) => setNewPhoto(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción de la foto"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Imagen</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                {newPhoto.image_url && (
                  <div className="mt-2">
                    <img
                      src={newPhoto.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUploading || !newPhoto.image_url}>
                  {isUploading ? 'Subiendo...' : 'Agregar Foto'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Photo Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Foto</DialogTitle>
              <DialogDescription>
                Actualiza el título y descripción de la foto
              </DialogDescription>
            </DialogHeader>
            {editingPhoto && (
              <form onSubmit={handleUpdatePhoto} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Título</Label>
                  <Input
                    id="edit-title"
                    value={editingPhoto.title}
                    onChange={(e) => setEditingPhoto(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Título de la foto"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripción (opcional)</Label>
                  <Textarea
                    id="edit-description"
                    value={editingPhoto.description || ''}
                    onChange={async (e) => {
                      setEditingPhoto(prev => prev ? { ...prev, description: e.target.value } : null);
                      await handleUpdatePhoto(editingPhoto)
                    }}
                    placeholder="Descripción de la foto"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vista previa</Label>
                  <div className="w-full h-32 relative rounded-md overflow-hidden">
                    <img
                      src={editingPhoto.image_url}
                      alt={editingPhoto.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={isUploading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? 'Actualizando...' : 'Actualizar Foto'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar fotos por título o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Bulk Upload Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{isMobile ? 'Subir fotos' : 'Subida múltiple'}</h3>
                {!isMobile &&
                  <p className="text-sm text-muted-foreground">
                    Arrastra y suelta múltiples fotos o selecciona archivos
                  </p>
                }
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar Fotos
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleMultipleFileSelect}
              className="hidden"
            />

            {!isMobile &&
              <div
                className={`
border-2 border-dashed rounded-lg p-8 text-center transition-colors
${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h4 className="text-lg font-semibold mb-2">
                  {dragActive ? 'Suelta las fotos aquí' : 'Arrastra fotos aquí'}
                </h4>
                <p className="text-muted-foreground">
                  O haz clic para seleccionar múltiples archivos de imagen
                </p>
              </div>
            }

            {uploadingFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Subiendo fotos ({uploadingFiles.length})</h4>
                {uploadingFiles.map((file) => (
                  <Card key={file.id} className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium truncate">{file.title}</span>
                          <div className="flex items-center space-x-2">
                            {file.status === 'success' && <Badge variant="default">Completado</Badge>}
                            {file.status === 'error' && <Badge variant="destructive">Error</Badge>}
                            <Button variant="ghost" size="sm" onClick={() => removeUploadingFile(file.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {file.status === 'uploading' && <Progress value={file.progress} className="h-2" />}
                        <div className="flex items-center space-x-4 mt-2">
                          <Input
                            placeholder="Título de la foto"
                            value={file.title}
                            onChange={(e) => updateUploadingFile(file.id, { title: e.target.value })}
                            className="flex-1"
                          // disabled={file.status !== 'uploading'}
                          />
                          <Input
                            placeholder="Descripción (opcional)"
                            value={file.description}
                            onChange={(e) => updateUploadingFile(file.id, { description: e.target.value })}
                            className="flex-1"
                          // disabled={file.status !== 'uploading'}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                ))}
                <Button onClick={confirmUpload}>
                  Confirmar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay fotos en la galería</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm ? 'No se encontraron fotos con ese término de búsqueda' : 'Agrega la primera foto a la galería'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPhotos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <PreviewDialog
                  url={photo.image_url}
                  title={photo.title}
                  isPDF={false}
                  trigger={
                    // Toda esta miniatura es clickable/touchable
                    <button
                      type="button"
                      className="group w-full h-full relative cursor-zoom-in focus:outline-none"
                      aria-label={`Ver imagen ${photo.title}`}
                    >
                      <img
                        src={photo.image_url}
                        alt={photo.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-[1.01]"
                      />

                      {/* Overlay sutil para indicar que se puede abrir */}
                      <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  }
                />
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{photo.title}</CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(photo)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar foto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. La foto será eliminada permanentemente de la galería.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(photo.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {photo.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {photo.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Creado el {format(new Date(photo.created_at), 'dd/MM/yyyy', { locale: es })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};