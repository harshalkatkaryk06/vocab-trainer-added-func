import { z } from "zod";

const email = z.string().email("Invalid email address").trim().toLowerCase();
const password = z
  .string()
  .min(8, "Password must be at least 8 characters long");
const username = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .trim()
  .toLowerCase();

export const schemas = {
  // POST /auth/register
  register: z.object({
    body: z.object({
      username: username,
      email: email,
      password: password,
    }),
  }),

  // POST /auth/login
  login: z.object({
    body: z.object({
      email: email,
      password: z.string().min(1, "Password is required"),
      remember: z.boolean().optional(),
    }),
  }),

  // POST /auth/google
  google: z.object({
    body: z.object({
      idToken: z.string().min(1, "Google token is required"),
    }),
  }),

  // POST /auth/forgot-password
  forgotPassword: z.object({
    body: z.object({
      email: email,
    }),
  }),

  // POST /auth/reset-password
  resetPassword: z.object({
    body: z.object({
      token: z.string().min(1, "Token is required"),
      password: password,
    }),
  }),

  // PATCH /auth/me
  updateProfile: z.object({
    body: z
      .object({
        username: username.optional(),
        email: email.optional(),
      })
      .refine((data) => data.username !== undefined || data.email !== undefined, {
        message: "Nothing to update",
      }),
  }),

  // POST /words/search
  searchWord: z.object({
    body: z.object({
      word: z.string().min(1, "Word is required").trim().toLowerCase(),
      forceExact: z.boolean().optional(),
    }),
  }),

  // POST /words/save
  saveWord: z.object({
    body: z.object({
      word: z.string().min(1, "Word is required").trim().toLowerCase(),
      type: z
        .enum([
          "word",
          "idiom",
          "phrase",
          "expression",
          "phrasal verb",
          "proverb",
        ])
        .optional(),
      partOfSpeech: z.string().optional(),
      primaryDefinition: z
        .string()
        .min(1, "primaryDefinition is required"),
      pronunciation: z.string().optional(),
      pronunciationReadable: z.string().optional(),
      examples: z.array(z.string()).optional(),
      // Support nested shape { source, data: {...} }
      source: z.string().optional(),
      data: z.any().optional(),
    }),
  }),

  // PATCH /words/:id
  updateWord: z.object({
    params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid word id"),
    }),
    body: z.object({
      word: z.string().trim().toLowerCase().optional(),
      type: z
        .enum([
          "word",
          "idiom",
          "phrase",
          "expression",
          "phrasal verb",
          "proverb",
        ])
        .optional(),
      partOfSpeech: z.string().optional(),
      primaryDefinition: z.string().min(1).optional(),
      pronunciation: z.string().optional(),
      pronunciationReadable: z.string().optional(),
      examples: z.array(z.string()).optional(),
      data: z.any().optional(),
    }),
  }),

  // POST /quiz/generate
  generateQuiz: z.object({
    body: z.object({
      count: z
        .preprocess(
          (val) => {
            if (val === undefined || val === "") return undefined;
            const num = parseInt(String(val), 10);
            return Number.isNaN(num) ? val : num;
          },
          z.number()
            .int("count must be a whole number")
            .min(1, "count must be at least 1")
            .max(20, "count must be at most 20")
        )
        .optional(),
    }),
  }),

  // DELETE /words/:id
  deleteWord: z.object({
    params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid word id"),
    }),
  }),

  // POST /admin/admins
  createAdmin: z.object({
    body: z.object({
      email: z.string().email("Invalid email address").trim().toLowerCase(),
    }),
  }),

  // PATCH /admin/users/:id/role
  changeUserRole: z.object({
    params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user id"),
    }),
    body: z.object({
      role: z.enum(["user", "admin", "super_admin"], {
        invalid_type_error: "Role must be user, admin, or super_admin",
      }),
    }),
  }),

  // POST /subscriptions/grant
  grantAccess: z.object({
    body: z.object({
      email: z.string().email("Invalid email address").trim().toLowerCase(),
      durationDays: z
        .preprocess(
          (val) => {
            if (val === undefined || val === "") return undefined;
            const num = parseInt(String(val), 10);
            return Number.isNaN(num) ? val : num;
          },
          z.number().int().min(1, "durationDays must be at least 1")
        ),
      planId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid plan id").optional(),
    }),
  }),

  // POST /subscriptions/revoke/:id
  revokeAccess: z.object({
    params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid subscription id"),
    }),
    body: z.object({
      reason: z.string().min(1, "Reason is required").optional(),
    }),
  }),

  // POST /subscriptions/plans
  savePlan: z.object({
    body: z.object({
      _id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid plan id").optional(),
      name: z.enum(["free", "paid"]),
      displayName: z.string().min(1, "Display name is required"),
      description: z.string().optional(),
      aiCalls: z
        .union([
          z.string().refine((v) => v === "unlimited", {
            message: 'aiCalls must be a number or "unlimited"',
          }),
          z.number().int().positive("aiCalls must be a positive number"),
        ])
        .optional(),
      durationDays: z
        .preprocess(
          (val) => {
            if (val === undefined || val === null || val === "") return undefined;
            const num = parseInt(String(val), 10);
            return Number.isNaN(num) ? val : num;
          },
          z.number().int().optional()
        ),
      price: z
        .preprocess(
          (val) => {
            if (val === undefined || val === "") return undefined;
            const num = parseFloat(String(val));
            return Number.isNaN(num) ? val : num;
          },
          z.number().min(0, "price must be non-negative")
        )
        .optional(),
      currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
      isActive: z.boolean().optional(),
      isPublic: z.boolean().optional(),
      sortOrder: z
        .preprocess(
          (val) => {
            if (val === undefined || val === null || val === "") return undefined;
            const num = parseInt(String(val), 10);
            return Number.isNaN(num) ? val : num;
          },
          z.number().int().optional()
        ),
    }),
  }),

  // POST /payments/order
  createOrder: z.object({
    body: z.object({
      planId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid plan id"),
    }),
  }),

  // POST /subscriptions/cancel
  cancelSubscription: z.object({
    body: z.object({
      reason: z
        .enum(["Too expensive", "Not using it", "Found an alternative", "Other"], {
          message: "Reason must be one of: Too expensive, Not using it, Found an alternative, Other",
        }),
      details: z.string().trim().max(1000).optional(),
      expectedRefundAmount: z
        .number()
        .int("expectedRefundAmount must be an integer (paise)")
        .nonnegative("expectedRefundAmount must be non-negative"),
      acceptedTerms: z
        .boolean()
        .refine((val) => val === true, {
          message: "You must accept the terms to cancel",
        }),
    }),
  }),

  reviewCancellationRequest: z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid cancellation request id"),
    }),
    body: z.object({
        reviewerNote: z.string().trim().max(1000).optional(),
    }),
  }),
};

/**
 * Express middleware that validates req.body, req.params, and/or req.query
 * against a Zod schema. On failure responds with 400 and structured errors.
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: (err.issues ?? []).map((e) => ({
            field: (e.path ?? []).join("."),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid request",
      });
    }
  };
};

export default schemas;
