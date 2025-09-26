// import { useState, useEffect } from 'react';
// import { useAuth } from '@/hooks/useAuth';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { UserPlus, Eye, EyeOff, Search, Users, Mail, Edit, Trash2 } from 'lucide-react';
// import { supabase } from '@/integrations/supabase/client';
// import { toast } from '@/hooks/use-toast';

// interface UserProfile {
//   id: string;
//   user_id: string;
//   email: string;
//   full_name: string | null;
//   role: string | null;
//   created_at: string;
//   updated_at: string;
// }

// export const AdminUsers = () => {
//   const [users, setUsers] = useState<UserProfile[]>([]);
//   const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [createLoading, setCreateLoading] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
//   const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
//   const { signUp } = useAuth();

//   useEffect(() => {
//     fetchUsers();
//   }, []);

//   useEffect(() => {
//     const filtered = users.filter(user =>
//       user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
//     );
//     setFilteredUsers(filtered);
//   }, [users, searchTerm]);

//   const fetchUsers = async () => {
//     try {
//       setLoading(true);
//       const { data, error } = await supabase
//         .from('profiles')
//         .select('*')
//         .order('created_at', { ascending: false });

//       if (error) throw error;

//       setUsers(data || []);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "No se pudieron cargar los usuarios.",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatDate = (dateStr: string) => {
//     return new Date(dateStr).toLocaleDateString('es-ES', {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });
//   };

//   if (loading) {
//     return (
//       <div className="text-center py-8">
//         <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//         <p className="text-muted-foreground">Cargando usuarios...</p>
//       </div>
//     );
//   }

//   const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setCreateLoading(true);

//     const formData = new FormData(e.currentTarget);
//     const email = formData.get('email') as string;
//     const password = formData.get('password') as string;
//     const fullName = formData.get('fullName') as string;

//     const { error } = await signUp(email, password, fullName);

//     if (error) {
//       toast({
//         title: "Error al crear usuario",
//         description: error.message === 'User already registered' 
//           ? "El usuario ya está registrado con este email."
//           : error.message,
//         variant: "destructive",
//       });
//     } else {
//       toast({
//         title: "Usuario creado exitosamente",
//         description: "Se ha enviado un email de confirmación al usuario.",
//       });
//       // Reset form
//       (e.target as HTMLFormElement).reset();
//       setIsDialogOpen(false);
//       fetchUsers();
//     }

//     setCreateLoading(false);
//   };

//   const handleEditUser = (user: UserProfile) => {
//     setEditingUser(user);
//     setIsEditDialogOpen(true);
//   };

//   const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!editingUser) return;

//     setCreateLoading(true);

//     const formData = new FormData(e.currentTarget);
//     const fullName = formData.get('fullName') as string;
//     const role = formData.get('role') as string;

//     try {
//       const { error } = await supabase
//         .from('profiles')
//         .update({
//           full_name: fullName,
//           role: role
//         })
//         .eq('id', editingUser.id);

//       if (error) throw error;

//       toast({
//         title: "Usuario actualizado",
//         description: "Los datos del usuario se han actualizado correctamente.",
//       });

//       setIsEditDialogOpen(false);
//       setEditingUser(null);
//       fetchUsers();
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "No se pudo actualizar el usuario.",
//         variant: "destructive",
//       });
//     }

//     setCreateLoading(false);
//   };

//   const handleDeleteUser = async (userProfile: UserProfile) => {
//     try {
//       // Call edge function to delete user from auth.users
//       const { error: authError } = await supabase.functions.invoke('delete-user', {
//         body: { userId: userProfile.user_id }
//       });

//       if (authError) {
//         console.error('Auth deletion error:', authError);
//         // Continue with profile deletion even if auth deletion fails
//       }

//       // Delete the profile (foreign keys will set to NULL where referenced)
//       const { error: profileError } = await supabase
//         .from('profiles')
//         .delete()
//         .eq('id', userProfile.id);

//       if (profileError) throw profileError;

//       toast({
//         title: "Usuario eliminado",
//         description: "El usuario ha sido eliminado completamente del sistema.",
//       });

//       fetchUsers();
//     } catch (error) {
//       console.error('Delete user error:', error);
//       toast({
//         title: "Error",
//         description: "No se pudo eliminar el usuario.",
//         variant: "destructive",
//       });
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Header with search and create button */}
//       <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
//         <div className="relative flex-1 max-w-md">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
//           <Input
//             placeholder="Buscar por nombre o email..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="pl-10"
//           />
//         </div>
        
//         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//           <DialogTrigger asChild>
//             <Button className="bg-gradient-warm hover:opacity-90">
//               <UserPlus className="w-4 h-4 mr-2" />
//               Nuevo Usuario
//             </Button>
//           </DialogTrigger>
//           <DialogContent className="max-w-md">
//             <DialogHeader>
//               <DialogTitle>Crear Nuevo Usuario</DialogTitle>
//             </DialogHeader>
//             <form onSubmit={handleCreateUser} className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="fullName">Nombre Completo</Label>
//                 <Input
//                   id="fullName"
//                   name="fullName"
//                   type="text"
//                   placeholder="Nombre completo del usuario"
//                   required
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="email">Email</Label>
//                 <Input
//                   id="email"
//                   name="email"
//                   type="email"
//                   placeholder="usuario@mishosgt.com"
//                   required
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="password">Contraseña</Label>
//                 <div className="relative">
//                   <Input
//                     id="password"
//                     name="password"
//                     type={showPassword ? "text" : "password"}
//                     placeholder="••••••••"
//                     required
//                     minLength={6}
//                   />
//                   <Button
//                     type="button"
//                     variant="ghost"
//                     size="sm"
//                     className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
//                     onClick={() => setShowPassword(!showPassword)}
//                   >
//                     {showPassword ? (
//                       <EyeOff className="h-4 w-4" />
//                     ) : (
//                       <Eye className="h-4 w-4" />
//                     )}
//                   </Button>
//                 </div>
//               </div>
//               <div className="flex gap-2 pt-4">
//                 <Button 
//                   type="button" 
//                   variant="outline" 
//                   onClick={() => setIsDialogOpen(false)}
//                   className="flex-1"
//                 >
//                   Cancelar
//                 </Button>
//                 <Button 
//                   type="submit" 
//                   className="flex-1" 
//                   disabled={createLoading}
//                 >
//                   {createLoading ? "Creando..." : "Crear Usuario"}
//                 </Button>
//               </div>
//             </form>
//             </DialogContent>
//           </Dialog>

//           {/* Edit User Dialog */}
//           <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
//             <DialogContent className="max-w-md">
//               <DialogHeader>
//                 <DialogTitle>Editar Usuario</DialogTitle>
//               </DialogHeader>
//               {editingUser && (
//                 <form onSubmit={handleUpdateUser} className="space-y-4">
//                   <div className="space-y-2">
//                     <Label htmlFor="editFullName">Nombre Completo</Label>
//                     <Input
//                       id="editFullName"
//                       name="fullName"
//                       type="text"
//                       defaultValue={editingUser.full_name || ''}
//                       placeholder="Nombre completo del usuario"
//                       required
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label htmlFor="editRole">Rol</Label>
//                     <Select name="role" defaultValue={editingUser.role || 'admin'}>
//                       <SelectTrigger>
//                         <SelectValue placeholder="Seleccionar rol" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="admin">Admin</SelectItem>
//                         <SelectItem value="user">Usuario</SelectItem>
//                         <SelectItem value="moderator">Moderador</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div className="bg-muted p-3 rounded-lg">
//                     <p className="text-sm text-muted-foreground">
//                       <strong>Email:</strong> {editingUser.email}
//                     </p>
//                     <p className="text-sm text-muted-foreground">
//                       <strong>Registrado:</strong> {formatDate(editingUser.created_at)}
//                     </p>
//                   </div>
//                   <div className="flex gap-2 pt-4">
//                     <Button 
//                       type="button" 
//                       variant="outline" 
//                       onClick={() => setIsEditDialogOpen(false)}
//                       className="flex-1"
//                     >
//                       Cancelar
//                     </Button>
//                     <Button 
//                       type="submit" 
//                       className="flex-1" 
//                       disabled={createLoading}
//                     >
//                       {createLoading ? "Actualizando..." : "Actualizar"}
//                     </Button>
//                   </div>
//                 </form>
//               )}
//             </DialogContent>
//           </Dialog>
//         </div>

//       {/* Users list */}
//       <Card className="shadow-warm">
//         <CardHeader>
//           <CardTitle>Usuarios del Sistema ({filteredUsers.length})</CardTitle>
//         </CardHeader>
//         <CardContent>
//           {filteredUsers.length === 0 ? (
//             <div className="text-center py-8">
//               <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
//               <p className="text-muted-foreground">
//                 {searchTerm ? 'No se encontraron usuarios con esa búsqueda.' : 'No hay usuarios registrados.'}
//               </p>
//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Usuario</TableHead>
//                     <TableHead>Email</TableHead>
//                     <TableHead>Rol</TableHead>
//                     <TableHead>Fecha de Registro</TableHead>
//                     <TableHead className="text-right">Acciones</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {filteredUsers.map((user) => (
//                     <TableRow key={user.id}>
//                       <TableCell>
//                         <div className="flex items-center space-x-3">
//                           <div className="w-8 h-8 bg-gradient-warm rounded-full flex items-center justify-center">
//                             <span className="text-sm font-semibold text-primary-foreground">
//                               {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
//                             </span>
//                           </div>
//                           <div>
//                             <p className="font-medium">
//                               {user.full_name || 'Sin nombre'}
//                             </p>
//                           </div>
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center space-x-1">
//                           <Mail className="w-4 h-4 text-muted-foreground" />
//                           <span className="text-sm">{user.email}</span>
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <Badge variant="secondary">
//                           {user.role || 'Admin'}
//                         </Badge>
//                       </TableCell>
//                       <TableCell>
//                         <span className="text-sm text-muted-foreground">
//                           {formatDate(user.created_at)}
//                         </span>
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <div className="flex items-center justify-end space-x-1">
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => handleEditUser(user)}
//                             className="text-muted-foreground hover:text-primary"
//                           >
//                             <Edit className="w-4 h-4" />
//                           </Button>
//                           <AlertDialog>
//                             <AlertDialogTrigger asChild>
//                               <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 className="text-destructive hover:text-destructive"
//                               >
//                                 <Trash2 className="w-4 h-4" />
//                               </Button>
//                             </AlertDialogTrigger>
//                             <AlertDialogContent>
//                               <AlertDialogHeader>
//                                 <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
//                                 <AlertDialogDescription>
//                                   Esta acción no se puede deshacer. El usuario "{user.full_name || user.email}" será eliminado permanentemente del sistema.
//                                 </AlertDialogDescription>
//                               </AlertDialogHeader>
//                               <AlertDialogFooter>
//                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
//                                 <AlertDialogAction
//                                   onClick={() => handleDeleteUser(user)}
//                                   className="bg-destructive hover:bg-destructive/90"
//                                 >
//                                   Eliminar
//                                 </AlertDialogAction>
//                               </AlertDialogFooter>
//                             </AlertDialogContent>
//                           </AlertDialog>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// };


import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Eye, EyeOff, Search, Users, Mail, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { callFn } from '@/lib/callFn';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Llama a la función con action=list
      const data = await callFn('admin-users', { action: 'list', search: searchTerm, page: 1, pageSize: 100 });

      setUsers(data?.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando usuarios...</p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    try {
      await callFn('admin-users', {
        action: 'create',
        email,
        password,
        fullName,
        role: 'user', // o 'admin' si quieres crear admins
      });

      toast({
        title: "Usuario creado",
        description: "El usuario fue creado correctamente.",
      });
      (e.target as HTMLFormElement).reset();
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error al crear usuario",
        description: error.message === 'User already registered'
          ? "El usuario ya está registrado con este email."
          : (error.message || "Error inesperado"),
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    setCreateLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const role = formData.get('role') as string;

    try {
      await callFn('admin-users', {
        action: 'update',
        userId: editingUser.user_id, // importante: la función usa user_id
        fullName,
        role,
      });

      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario se han actualizado correctamente.",
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario.",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteUser = async (userProfile: UserProfile) => {
    try {
      await callFn('admin-users', {
        action: 'delete',
        userId: userProfile.user_id,
      });

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado completamente del sistema.",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with search and create button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers() }}
            className="pl-10"
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Nombre completo del usuario"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@mishosgt.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)}
                  </Button>
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
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={createLoading}
                >
                  {createLoading ? "Creando..." : "Crear Usuario"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editFullName">Nombre Completo</Label>
                  <Input
                    id="editFullName"
                    name="fullName"
                    type="text"
                    defaultValue={editingUser.full_name || ''}
                    placeholder="Nombre completo del usuario"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRole">Rol</Label>
                  <Select name="role" defaultValue={editingUser.role || 'admin'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="moderator">Moderador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Email:</strong> {editingUser.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Registrado:</strong> {formatDate(editingUser.created_at)}
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={createLoading}
                  >
                    {createLoading ? "Actualizando..." : "Actualizar"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Users list */}
      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>Usuarios del Sistema ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron usuarios con esa búsqueda.' : 'No hay usuarios registrados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-warm rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-foreground">
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.full_name || 'Sin nombre'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.role || 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El usuario "{user.full_name || user.email}" será eliminado permanentemente del sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user)}
                                  className="bg-destructive hover:bg-destructive/90"
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