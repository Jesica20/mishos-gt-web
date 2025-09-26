import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { callFn } from '@/lib/callFn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, FileImage, Trash2, Search, Edit, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface Recommendation {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

interface UploadingFile {
  file: File;
  title: string;
  description: string;
  category: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  id: string;
}

export const AdminRecommendations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecommendation, setEditingRecommendation] = useState<Recommendation | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Form state
  const [newRecommendation, setNewRecommendation] = useState({
    title: '',
    description: '',
    image_url: '',
    category: 'general',
    is_active: true
  });

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Filtrado en cliente para respuesta inmediata al teclear.
    const filtered = recommendations.filter(rec =>
      rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.description && rec.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rec.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecommendations(filtered);
  }, [searchTerm, recommendations]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await callFn<{
        data: Recommendation[];
        page: number; pageSize: number; total: number; totalPages: number;
      }>('admin-recommendations', { action: 'list', search: '', page: 1, pageSize: 200 });
      setRecommendations(res?.data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las recomendaciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return null;

    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `recommendations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleBulkUpload = async (files: File[]) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para subir recomendaciones",
        variant: "destructive"
      });
      return;
    }

    let uploadingFilesVal: UploadingFile[] = files.map(file => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      description: '',
      category: 'general',
      progress: 0,
      status: 'uploading' as const,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setUploadingFiles(uploadingFilesVal);
    setIsUploading(true);

    for (const uploadFile of uploadingFilesVal) {
      try {
        uploadingFilesVal = uploadingFilesVal.map(f => f.id === uploadFile.id ? { ...f, progress: 25 } : f);

        const imageUrl = await handleImageUpload(uploadFile.file);

        uploadingFilesVal = uploadingFilesVal.map(f => f.id === uploadFile.id ? { ...f, progress: 75 } : f);

        await callFn('admin-recommendations', {
          action: 'create',
          title: uploadFile.title,
          description: uploadFile.description,
          image_url: imageUrl,
          category: uploadFile.category,
          is_active: true
        });

        uploadingFilesVal = uploadingFilesVal.map(f => f.id === uploadFile.id ? { ...f, progress: 100, status: 'success' } : f);
      } catch (error) {
        console.error('Error uploading file:', error);
        uploadingFilesVal = uploadingFilesVal.map(f => f.id === uploadFile.id ? { ...f, status: 'error' } : f);
      }
    }

    const successful = uploadingFilesVal.filter(f => f.status === 'success').length;
    toast({
      title: successful > 0 ? "Éxito" : "Error",
      description: `Intento de subida múltiple finalizado`,
      variant: successful > 0 ? "default" : "destructive"
    });

    setTimeout(() => {
      setUploadingFiles([]);
      setIsUploading(false);
      fetchRecommendations();
    }, 600);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) handleBulkUpload(files);
  };

  const handleMultipleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) handleBulkUpload(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateUploadingFile = (id: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const imageUrl = await handleImageUpload(file);
      if (imageUrl) {
        setNewRecommendation(prev => ({ ...prev, image_url: imageUrl }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Error", description: "Debes estar autenticado para crear recomendaciones", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      await callFn('admin-recommendations', {
        action: 'create',
        title: newRecommendation.title,
        description: newRecommendation.description,
        image_url: newRecommendation.image_url,
        category: newRecommendation.category,
        is_active: newRecommendation.is_active
      });
      toast({ title: "Éxito", description: "Recomendación creada correctamente" });
      setNewRecommendation({ title: '', description: '', image_url: '', category: 'general', is_active: true });
      setIsCreateDialogOpen(false);
      fetchRecommendations();
    } catch (error) {
      console.error('Error creating recommendation:', error);
      toast({ title: "Error", description: "No se pudo crear la recomendación", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (recommendation: Recommendation) => {
    setEditingRecommendation(recommendation);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecommendation || !user) {
      toast({ title: "Error", description: "No se pudo actualizar la recomendación", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      await callFn('admin-recommendations', {
        action: 'update',
        id: editingRecommendation.id,
        title: editingRecommendation.title,
        description: editingRecommendation.description,
        category: editingRecommendation.category,
        is_active: editingRecommendation.is_active
      });
      toast({ title: "Éxito", description: "Recomendación actualizada correctamente" });
      setEditingRecommendation(null);
      setIsEditDialogOpen(false);
      fetchRecommendations();
    } catch (error) {
      console.error('Error updating recommendation:', error);
      toast({ title: "Error", description: "No se pudo actualizar la recomendación", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await callFn('admin-recommendations', { action: 'delete', id });
      toast({ title: "Éxito", description: "Recomendación eliminada correctamente" });
      fetchRecommendations();
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      toast({ title: "Error", description: "No se pudo eliminar la recomendación", variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await callFn('admin-recommendations', { action: 'toggle', id, is_active: isActive });
      toast({ title: "Éxito", description: `Recomendación ${!isActive ? 'activada' : 'desactivada'} correctamente` });
      fetchRecommendations();
    } catch (error) {
      console.error('Error toggling recommendation:', error);
      toast({ title: "Error", description: "No se pudo cambiar el estado de la recomendación", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando recomendaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Recomendaciones para Citas</h2>
          <p className="text-muted-foreground">
            Gestiona las imágenes de recomendación que se muestran después de agendar una cita
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Recomendación
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Recomendación</DialogTitle>
              <DialogDescription>
                Agrega una nueva imagen de recomendación para citas programadas
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newRecommendation.title}
                  onChange={(e) => setNewRecommendation(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título de la recomendación"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={newRecommendation.description}
                  onChange={(e) => setNewRecommendation(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción de la recomendación"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select 
                  value={newRecommendation.category} 
                  onValueChange={(value) => setNewRecommendation(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="cuidados">Cuidados Post-Operatorios</SelectItem>
                    <SelectItem value="alimentacion">Alimentación</SelectItem>
                    <SelectItem value="medicamentos">Medicamentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Imagen</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {newRecommendation.image_url && (
                  <div className="mt-2">
                    <img
                      src={newRecommendation.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={newRecommendation.is_active}
                  onCheckedChange={(checked) => setNewRecommendation(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Activo</Label>
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
                <Button type="submit" disabled={isUploading || !newRecommendation.image_url}>
                  {isUploading ? 'Guardando...' : 'Crear Recomendación'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Recomendación</DialogTitle>
              <DialogDescription>
                Actualiza la información de la recomendación
              </DialogDescription>
            </DialogHeader>
            
            {editingRecommendation && (
              <form onSubmit={handleUpdateRecommendation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Título</Label>
                  <Input
                    id="edit-title"
                    value={editingRecommendation.title}
                    onChange={(e) => setEditingRecommendation(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Título de la recomendación"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripción (opcional)</Label>
                  <Textarea
                    id="edit-description"
                    value={editingRecommendation.description || ''}
                    onChange={(e) => setEditingRecommendation(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Descripción de la recomendación"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Select 
                    value={editingRecommendation.category} 
                    onValueChange={(value) => setEditingRecommendation(prev => prev ? { ...prev, category: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="cuidados">Cuidados Post-Operatorios</SelectItem>
                      <SelectItem value="alimentacion">Alimentación</SelectItem>
                      <SelectItem value="medicamentos">Medicamentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vista previa</Label>
                  <div className="w-full h-32 relative rounded-md overflow-hidden">
                    <img
                      src={editingRecommendation.image_url}
                      alt={editingRecommendation.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-is_active"
                    checked={editingRecommendation.is_active}
                    onCheckedChange={(checked) => setEditingRecommendation(prev => prev ? { ...prev, is_active: checked } : null)}
                  />
                  <Label htmlFor="edit-is_active">Activo</Label>
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
                    {isUploading ? 'Actualizando...' : 'Actualizar'}
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
          placeholder="Buscar recomendaciones por título, descripción o categoría..."
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
                Seleccionar Imágenes
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
                  ${dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                  }
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
                  {dragActive ? 'Suelta las imágenes aquí' : 'Arrastra imágenes aquí'}
                </h4>
                <p className="text-muted-foreground">
                  O haz clic para seleccionar múltiples archivos de imagen
                </p>
              </div>
            }

            {uploadingFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Subiendo recomendaciones ({uploadingFiles.length})</h4>
                {uploadingFiles.map((file) => (
                  <Card key={file.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                            <FileImage className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {file.status === 'uploading' && 'Subiendo...'}
                              {file.status === 'success' && 'Completado'}
                              {file.status === 'error' && 'Error'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {file.status === 'uploading' && (
                            <Button variant="ghost" size="sm" onClick={() => removeUploadingFile(file.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="h-2" />
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          placeholder="Título"
                          value={file.title}
                          onChange={(e) => updateUploadingFile(file.id, { title: e.target.value })}
                          disabled={file.status !== 'uploading'}
                        />
                        <Input
                          placeholder="Descripción"
                          value={file.description}
                          onChange={(e) => updateUploadingFile(file.id, { description: e.target.value })}
                          disabled={file.status !== 'uploading'}
                        />
                        <Select 
                          value={file.category} 
                          onValueChange={(value) => updateUploadingFile(file.id, { category: value })}
                          disabled={file.status !== 'uploading'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="cuidados">Cuidados Post-Operatorios</SelectItem>
                            <SelectItem value="alimentacion">Alimentación</SelectItem>
                            <SelectItem value="medicamentos">Medicamentos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Grid */}
      {filteredRecommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileImage className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay recomendaciones</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm ? 'No se encontraron recomendaciones con ese término de búsqueda' : 'Agrega la primera recomendación para citas'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecommendations.map((recommendation) => (
            <Card key={recommendation.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={recommendation.image_url}
                  alt={recommendation.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant={recommendation.is_active ? "default" : "secondary"}>
                    {recommendation.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{recommendation.title}</CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleActive(recommendation.id, recommendation.is_active)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Switch checked={recommendation.is_active} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(recommendation)}
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
                          <AlertDialogTitle>¿Eliminar recomendación?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. La recomendación será eliminada permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(recommendation.id)}
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
                <Badge variant="outline" className="mb-3">
                  {recommendation.category}
                </Badge>
                {recommendation.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {recommendation.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Creado el {format(new Date(recommendation.created_at), 'dd/MM/yyyy', { locale: es })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};