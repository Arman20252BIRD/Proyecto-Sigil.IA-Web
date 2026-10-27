
import { Request, Response } from 'express';
import { pool } from '../config/db';

// PASO 1: Validar credenciales (Correo y Contraseña)
export const loginStepOne = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'El correo y la contraseña son obligatorios' });
            return;
        }

        // Buscar al administrador en la base de datos
        const query = 'SELECT * FROM admins WHERE email = $1';
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        const admin = result.rows[0];

        // Nota: Aquí debes comparar la contraseña (idealmente usando bcrypt.compare)
        // Por ahora simularemos la validación básica:
        if (admin.password !== password) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        // Si las credenciales son correctas, pasamos al Paso 2 (Reconocimiento Facial / MFA)
        res.json({ 
            success: true, 
            message: 'Credenciales correctas. Proceda al reconocimiento facial.',
            adminId: admin.id 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor al procesar el inicio de sesión' });
    }
};

// PASO 2: Validar el rostro / MFA
export const verifyFacialMfa = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId, facialToken } = req.body;

        if (!adminId) {
            res.status(400).json({ error: 'ID de administrador requerido' });
            return;
        }

        // Aquí integrarías la lógica de validación biométrica o token MFA
        // Simulamos éxito en el reconocimiento facial:
        res.json({ 
            success: true, 
            message: 'Autenticación multifactor y biométrica exitosa',
            token: 'JWT_TOKEN_SEGURO_O_SESION_INICIADA' 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en la verificación biométrica' });
    }
};