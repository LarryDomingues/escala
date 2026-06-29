import connectDB from '../../../../lib/mongodb';
import Usuario from '../../../../lib/models/Usuario';
import Log from '../../../../lib/models/Log';
import { getUserFromToken } from '../../../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão. Apenas administradores podem acessar.' });
  }

  await connectDB();

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { acao, nivel } = req.body;

      if (!id || id === user.id) {
        return res.status(400).json({ error: 'Não é possível modificar o próprio usuário' });
      }

      const usuario = await Usuario.findById(id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      let descricao = '';

      if (acao) {
        const statusMap = {
          ativar: 'ativo',
          bloquear: 'bloqueado',
          desbloquear: 'ativo',
        };
        if (statusMap[acao]) {
          usuario.status = statusMap[acao];
          descricao = `Usuário ${usuario.nome} foi ${acao}do`;
        }
      }

      if (nivel) {
        if (!['membro', 'coordenador', 'admin'].includes(nivel)) {
          return res.status(400).json({ error: 'Nível inválido' });
        }
        usuario.nivel = nivel;
        descricao = `Usuário ${usuario.nome} foi promovido para ${nivel}`;
      }

      await usuario.save();

      await Log.create({
        usuario_id: user.id,
        acao: 'admin_usuarios',
        descricao: `${descricao} por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      return res.status(200).json({
        success: true,
        message: 'Usuário atualizado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}