import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from '@/hooks/use-toast';
import { Calendar, Clock, PawPrint, Download, X, ChevronDown, Check, FileText, Badge } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PreviewDialog } from './PreviewDialog';

const DOG_BREEDS = [
  "Mestizo",
  "German Shepherd",
  "Labrador Retriever",
  "Golden Retriever",
  "Rottweiler",
  "Doberman",
  "English Bulldog",
  "French Bulldog",
  "Beagle",
  "Poodle",
  "Shih Tzu",
  "Chihuahua",
  "Collie",
  "Dalmatian",
  "Boxer",
  "Cocker Spaniel",
  "Schnauzer",
  "Siberian Husky",
  "Alaskan Malamute",
  "Saint Bernard",
  "Great Dane",
  "Neapolitan Mastiff",
  "Pug",
  "Boston Terrier",
  "Akita Inu",
  "Border Collie",
  "Jack Russell Terrier",
  "American Boxer",
  "Weimaraner",
  "Basset Hound"
];

interface Campaign {
  id: string;
  title: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  max_appointments: number;
}

interface AppointmentModalProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  // Pet informatio
  pet_name: string;
  pet_size: 'pequeña' | 'mediana' | 'grande' | '';
  pet_weight: string;
  pet_breed: string;
  pet_age_years: string;
  pet_age_months: string;
  pet_allergies: string;
  medical_complications: string;
  vaccinations: string;
  // Owner information
  owner_first_name: string;
  owner_last_name: string;
  owner_age: string;
  owner_id: string;
}

interface Recommendation {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  category: string;
}

export const AppointmentModal = ({ campaign, isOpen, onClose, onSuccess }: AppointmentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const initialFormData: FormData = {
    pet_name: '',
    pet_size: '',
    pet_weight: '',
    pet_breed: '',
    pet_age_years: '',
    pet_age_months: '',
    pet_allergies: '',
    medical_complications: '',
    vaccinations: '',
    owner_first_name: '',
    owner_last_name: '',
    owner_age: '',
    owner_id: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    if (showRecommendations) {
      fetchRecommendations();
    }
  }, [showRecommendations]);

  const fetchRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_recommendations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const downloadRecommendations = async () => {
    for (const recommendation of recommendations) {
      if (recommendation.image_url) {
        try {
          const response = await fetch(recommendation.image_url);
          const blob = await response.blob();
          // Extract filename from URL or create one based on title
          const urlParts = recommendation.image_url.split('/');
          const originalFilename = urlParts[urlParts.length - 1];
          const extension = originalFilename.includes('.') ?
            originalFilename.split('.').pop() : 'jpg';
          const filename = `${recommendation.title.toLowerCase().replace(/\s+/g, '-')}.${extension}`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error downloading ${recommendation.title}:`, error);
        }
      }
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
  * Guatemala DPI / CUI validator
  *
  * Rules implemented:
  * 1) Exact length: 13 numeric characters.
  * 2) Structure: AAAAAAAA V DD MM
  * - A (8): random/assigned digits by RENAP
  * - V (1): check digit (mod-11 on the first 8 digits, weights 2..9)
  * - DD (2): department code (01..22)
  * - MM (2): municipality code (01..max per department)
  * 3) Department & municipality must exist (per official GT 22/340 division).
  *
  * @param {string} input - DPI/CUI as string (can include spaces/dashes; they'll be stripped).
  * @returns {{ valid: boolean, reason?: string }}
  */
  const validateGuatemalaDPI = (input: string) => {
    // 1) Sanitize: keep only digits
    const cui = String(input).replace(/\D+/g, '');

    if (cui.length !== 13) {
      return { valid: false, reason: 'Debe tener exactamente 13 dígitos' };
    }

    // Split parts
    const core = cui.slice(0, 8); // first 8 digits (assigned)
    const dv = Number(cui.slice(8, 9)); // check digit
    const dept = Number(cui.slice(9, 11)); // department
    const muni = Number(cui.slice(11, 13));// municipality

    // 2) Department range (01..22)
    if (dept < 1 || dept > 22) {
      return { valid: false, reason: 'Departamento inválido (fuera de 01–22)' };
    }

    // 3) Municipality range by department (1..max)
    // Counts from INE/RENAP listings (22 departamentos / 340 municipios).
    // Index by department code (1-based). Example: 1=Guatemala, 2=El Progreso, etc.
    const MUNICIPALITIES_PER_DEPT = [
      null, // pad to make it 1-based
      17, // 01 Guatemala
      8, // 02 El Progreso
      16, // 03 Sacatepéquez
      16, // 04 Chimaltenango
      13, // 05 Escuintla
      14, // 06 Santa Rosa
      19, // 07 Sololá
      8, // 08 Totonicapán
      24, // 09 Quetzaltenango
      21, // 10 Suchitepéquez
      9, // 11 Retalhuleu
      30, // 12 San Marcos
      32, // 13 Huehuetenango
      21, // 14 Quiché
      8, // 15 Baja Verapaz
      17, // 16 Alta Verapaz
      14, // 17 Petén
      5, // 18 Izabal
      11, // 19 Zacapa
      11, // 20 Chiquimula
      7, // 21 Jalapa
      17 // 22 Jutiapa
    ];

    const muniMax = MUNICIPALITIES_PER_DEPT[dept];
    if (muni < 1 || muni > muniMax) {
      return { valid: false, reason: `Municipio inválido para el departamento ${String(dept).padStart(2, '0')} (1–${muniMax})` };
    }

    // 4) Check digit: modulo 11 on first 8 digits, weights 2..9 (left to right)
    const digits = core.split('').map(Number);
    const sum = digits.reduce((acc, d, i) => acc + d * (i + 2), 0);
    const expectedDV = sum % 11;

    if (expectedDV === 10 || expectedDV !== dv) {
      return { valid: false, reason: 'Dígito verificador inválido (módulo 11)' };
    }

    return { valid: true };
  };

  const validateForm = () => {
    const requiredFields = ['pet_name', 'pet_size', 'owner_first_name', 'owner_last_name', 'owner_age', 'owner_id'];
    for (const field of requiredFields) {
      console.log('formData[field as keyof FormData] ', formData[field as keyof FormData])
      if (!formData[field as keyof FormData]) {
        toast({
          title: "Faltan campos obligatorios",
          description: "Por favor completa todos los campos marcados con *",
          variant: "destructive",
        });
        return false;
      }
    }

    // Validate weight is not negative
    if (formData.pet_weight && parseFloat(formData.pet_weight) < 0) {
      toast({
        title: "Peso inválido",
        description: "El peso no puede ser negativo",
        variant: "destructive",
      });
      return false;
    }

    // Validate DPI format for Guatemala
    const dpiValidation = validateGuatemalaDPI(formData.owner_id);
    if (!dpiValidation.valid) {
      toast({
        title: "DPI inválido",
        description: dpiValidation.reason || "El DPI no cumple con el formato válido de Guatemala",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const appointmentData = {
        campaign_id: campaign.id,
        appointment_time: null,
        pet_name: formData.pet_name,
        pet_size: formData.pet_size,
        pet_weight: formData.pet_weight ? parseFloat(formData.pet_weight) : null,
        pet_breed: formData.pet_breed || null,
        pet_age: formData.pet_age_years || formData.pet_age_months ?
          (parseInt(formData.pet_age_years || '0') * 12) + parseInt(formData.pet_age_months || '0')
          : null,
        pet_allergies: formData.pet_allergies || null,
        medical_complications: formData.medical_complications || null,
        vaccinations: formData.vaccinations || null,
        owner_first_name: formData.owner_first_name,
        owner_last_name: formData.owner_last_name,
        owner_age: parseInt(formData.owner_age),
        owner_id: formData.owner_id,
      };

      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Horario no disponible",
            description: "Este horario ya fue reservado. Por favor selecciona otro horario.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "¡Cita agendada exitosamente!",
          description: `Tu cita ha sido confirmada para el ${format(new Date(campaign.date), 'dd/MM/yyyy')}`,
        });
        setShowRecommendations(true);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error al agendar cita",
        description: "Hubo un problema al agendar tu cita. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showRecommendations) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl text-green-600 mb-4">
              ¡Cita confirmada exitosamente!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Detalles de tu cita:</h3>
              <div className="grid md:grid-cols-2 gap-2">
                <p className="text-green-700">
                  <strong>Fecha:</strong> {format(new Date(campaign.date), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                </p>
                <p className="text-green-700">
                  <strong>Lugar:</strong> {campaign.location}
                </p>
                <p className="text-green-700">
                  <strong>Mascota:</strong> {formData.pet_name}
                </p>
                <p className="text-green-700">
                  <strong>Tamaño:</strong> {formData.pet_size}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-4">Recomendaciones de cuidado</h3>
              {recommendations.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendations.map((rec) => {
                    const isPDF = rec.image_url.toLowerCase().endsWith(".pdf");
                    return (
                      <div key={rec.id} className="bg-white p-3 rounded-lg border">
                        <div className="aspect-square mb-3 overflow-hidden rounded-md">
                          <PreviewDialog
                            url={rec.image_url}
                            title={rec.title}
                            isPDF={isPDF}
                            trigger={
                              // Toda esta miniatura es clickable/touchable
                              <button
                                type="button"
                                className="group w-full h-full relative cursor-zoom-in focus:outline-none"
                                aria-label={`Ver ${isPDF ? 'documento' : 'imagen'} "${rec.title}"`}
                              >
                                {isPDF ? (
                                  <div className="flex items-center justify-center h-full">
                                    <FileText size={100} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                ) : (
                                  <img
                                    src={rec.image_url}
                                    alt={rec.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-[1.01]"
                                  />
                                )}

                                {/* Badge se queda igual */}
                                <div className="absolute top-2 right-2">
                                  <Badge variant={rec?.is_active ? "default" : "secondary"}>
                                    {rec?.is_active ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </div>

                                {/* Overlay sutil para indicar que se puede abrir */}
                                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              </button>
                            }
                          />
                        </div>
                        <h4 className="font-medium text-blue-800 mb-1">{rec.title}</h4>
                        <p className="text-xs text-blue-600 mb-2 bg-blue-100 px-2 py-1 rounded">
                          {rec.category}
                        </p>
                        {rec.description && (
                          <p className="text-sm text-blue-700">{rec.description}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-blue-700">No hay recomendaciones disponibles en este momento.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={downloadRecommendations}
                variant="outline"
                className="flex-1"
                disabled={recommendations.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Recomendaciones
              </Button>
              <Button
                onClick={() => {
                  setShowRecommendations(false);
                  resetForm();
                  onSuccess();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <X className="w-4 h-4 mr-2" />
                Aceptar y Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <PawPrint className="w-5 h-5 text-primary" />
            <span>Agendar Cita de Castración</span>
          </DialogTitle>
          <DialogDescription>
            Completa la información de tu mascota y datos personales para agendar la cita
          </DialogDescription>
        </DialogHeader>

        {/* Campaign Info */}
        <div className="bg-secondary/50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">{campaign.title}</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {format(new Date(campaign.date), 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: es })}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {campaign.start_time} - {campaign.end_time}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pet Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Información de la mascota</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pet_name">Nombre de la mascota *</Label>
                <Input
                  id="pet_name"
                  value={formData.pet_name}
                  onChange={(e) => handleInputChange('pet_name', e.target.value)}
                  placeholder="Nombre de tu mascota"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pet_size">Talla *</Label>
                <Select value={formData.pet_size} onValueChange={(value) => handleInputChange('pet_size', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la talla" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeña">Pequeña</SelectItem>
                    <SelectItem value="mediana">Mediana</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pet_weight">Peso (lb)</Label>
                <Input
                  id="pet_weight"
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  value={formData.pet_weight}
                  onChange={(e) => handleInputChange('pet_weight', e.target.value)}
                  placeholder="Peso en libras"
                />
              </div>
              <div>
                <Label htmlFor="pet_breed">Raza</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {formData.pet_breed || "Selecciona una raza..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar raza..." />
                      <CommandEmpty>No se encontró ninguna raza.</CommandEmpty>
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandGroup>
                          {DOG_BREEDS.map((breed) => (
                            <CommandItem
                              key={breed}
                              value={breed}
                              onSelect={(value) => {
                                handleInputChange('pet_breed', value)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.pet_breed === breed ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {breed}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="pet_age_years">Años</Label>
                  <Input
                    id="pet_age_years"
                    type="number"
                    min="0"
                    max="20"
                    value={formData.pet_age_years}
                    onChange={(e) => handleInputChange('pet_age_years', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="pet_age_months">Meses</Label>
                  <Input
                    id="pet_age_months"
                    type="number"
                    defaultValue="0"
                    min="0"
                    max="11"
                    value={formData.pet_age_months}
                    onChange={(e) => handleInputChange('pet_age_months', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="pet_allergies">Alergias</Label>
              <Textarea
                id="pet_allergies"
                value={formData.pet_allergies}
                onChange={(e) => handleInputChange('pet_allergies', e.target.value)}
                placeholder="Describe cualquier alergia conocida"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="medical_complications">Complicación médica</Label>
              <Textarea
                id="medical_complications"
                value={formData.medical_complications}
                onChange={(e) => handleInputChange('medical_complications', e.target.value)}
                placeholder="Indica cualquier complicación médica"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="vaccinations">Vacunas</Label>
              <Textarea
                id="vaccinations"
                value={formData.vaccinations}
                onChange={(e) => handleInputChange('vaccinations', e.target.value)}
                placeholder="Lista las vacunas que tiene tu mascota"
                rows={2}
              />
            </div>
          </div>

          {/* Owner Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Información del responsable</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner_first_name">Nombres *</Label>
                <Input
                  id="owner_first_name"
                  value={formData.owner_first_name}
                  onChange={(e) => handleInputChange('owner_first_name', e.target.value)}
                  placeholder="Tus nombres"
                  required
                />
              </div>
              <div>
                <Label htmlFor="owner_last_name">Apellidos *</Label>
                <Input
                  id="owner_last_name"
                  value={formData.owner_last_name}
                  onChange={(e) => handleInputChange('owner_last_name', e.target.value)}
                  placeholder="Tus apellidos"
                  required
                />
              </div>
              <div>
                <Label htmlFor="owner_age">Edad *</Label>
                <Input
                  id="owner_age"
                  type="number"
                  value={formData.owner_age}
                  onChange={(e) => handleInputChange('owner_age', e.target.value)}
                  placeholder="Tu edad"
                  required
                />
              </div>
              <div>
                <Label htmlFor="owner_id">DPI (13 dígitos) *</Label>
                <Input
                  id="owner_id"
                  type="text"
                  pattern="[0-9]{13}"
                  maxLength={13}
                  value={formData.owner_id}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, '');
                    handleInputChange('owner_id', value);
                  }}
                  placeholder="1234567890123"
                  required
                />
              </div>
            </div>
          </div>


          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-warm hover:opacity-90"
              disabled={loading}
            >
              {loading ? 'Agendando...' : 'Agendar Cita'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};