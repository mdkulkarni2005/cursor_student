from manim import *

config.background_color = "#0c1220"

STEEL = "#7a8590"
DARK_STEEL = "#4a4540"
BEAD_HOT = "#ffb347"
BEAD_COOL = "#9aa5ad"
HAZ = "#ff7a45"
FAINT = "#8a94a3"
TORCH = "#c9c4b8"


def numbered_dot(n):
    dot = Circle(radius=0.16, color=WHITE, fill_color="#0c1220", fill_opacity=1, stroke_width=1.5)
    label = Text(str(n), font_size=16, color=WHITE, weight=BOLD)
    label.move_to(dot.get_center())
    return VGroup(dot, label)


class WeldingScene(Scene):
    def construct(self):
        title = Text("Welding — V-Groove Butt Joint", font_size=28, color=WHITE, weight=BOLD).to_edge(UP, buff=0.35)
        self.play(FadeIn(title, shift=UP * 0.2), run_time=0.5)

        joint_x = 0.0
        gap_wide, gap_tight = 0.55, 0.14
        plate_h = 0.7
        left_far, right_far = -3.6, 3.6

        def make_plates(gap):
            left = Polygon(
                [left_far, 0.35, 0], [joint_x - gap / 2, 0.35, 0], [joint_x - gap / 2 - 0.35, -0.35, 0], [left_far, -0.35, 0],
                color=DARK_STEEL, fill_color=STEEL, fill_opacity=1, stroke_width=1.6,
            )
            right = Polygon(
                [joint_x + gap / 2, 0.35, 0], [right_far, 0.35, 0], [right_far, -0.35, 0], [joint_x + gap / 2 + 0.35, -0.35, 0],
                color=DARK_STEEL, fill_color=STEEL, fill_opacity=1, stroke_width=1.6,
            )
            return VGroup(left, right)

        plates = make_plates(gap_wide)

        haz = Rectangle(width=0.001, height=plate_h + 0.1, color=HAZ, fill_color=HAZ, fill_opacity=0.16, stroke_width=0)
        haz.move_to(np.array([left_far, 0, 0]), aligned_edge=LEFT)

        weld_start_x = left_far + 0.2
        weld_end_x = right_far - 0.2

        bead = Rectangle(width=0.001, height=0.18, color=BEAD_HOT, fill_color=BEAD_HOT, fill_opacity=1, stroke_width=0)
        bead.move_to(np.array([left_far + 3.6 - gap_wide / 2, 0.4, 0]), aligned_edge=LEFT)

        def make_torch(tip_x, tip_y=0.42):
            tip = np.array([tip_x, tip_y, 0])
            top = tip + np.array([0.65, 1.1, 0])
            line = Line(top, tip, color=TORCH, stroke_width=7)
            tri = Triangle(color=TORCH, fill_color=TORCH, fill_opacity=1).scale(0.12).move_to(top).rotate(PI)
            return VGroup(line, tri)

        torch = make_torch(weld_start_x)

        n1 = numbered_dot(1).move_to(np.array([-2.5, 0.9, 0]))
        n2 = numbered_dot(2).move_to(np.array([1.1, 1.7, 0]))
        n3 = numbered_dot(3).move_to(np.array([0, 0.75, 0]))
        n4 = numbered_dot(4).move_to(np.array([-1.5, 0.75, 0]))
        n5 = numbered_dot(5).move_to(np.array([-1.5, -0.6, 0]))

        legend = Text(
            "1 Base Metal   2 Electrode / Torch   3 Arc   4 Weld Pool / Bead   5 Heat-Affected Zone (HAZ)",
            font_size=16, color=FAINT,
        ).to_edge(DOWN, buff=0.3)

        caption = Text("Edge preparation & fit-up", font_size=22, color=WHITE, weight=BOLD)
        caption.next_to(legend, UP, buff=0.25)
        step_label = Text("STEP 1 / 4", font_size=14, color=FAINT, weight=BOLD)
        step_label.next_to(caption, UP, buff=0.12)

        gap_dim = DoubleArrow(np.array([joint_x - gap_wide / 2, -0.7, 0]), np.array([joint_x + gap_wide / 2, -0.7, 0]), color=FAINT, stroke_width=1.5, buff=0)

        self.play(
            FadeIn(plates), FadeIn(gap_dim),
            FadeIn(legend), FadeIn(caption), FadeIn(step_label),
            FadeIn(n1), FadeIn(n4),
            run_time=0.9,
        )
        self.wait(0.6)

        # Step 2 — localized heating begins
        new_caption = Text("Localized heating melts the joint", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 2 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        tight_plates = make_plates(gap_tight)
        self.play(
            Transform(caption, new_caption), Transform(step_label, new_step),
            Transform(plates, tight_plates), FadeOut(gap_dim),
            FadeIn(torch), FadeIn(n2), FadeIn(n3),
            run_time=0.8,
        )

        arc = VGroup(
            Circle(radius=0.14, color="#ffd166", fill_color="#ffd166", fill_opacity=0.35, stroke_width=0),
            Circle(radius=0.06, color="#fff4d6", fill_color="#fff4d6", fill_opacity=1, stroke_width=0),
        )
        arc.move_to(np.array([weld_start_x, 0.42, 0]))
        self.play(FadeIn(arc), run_time=0.3)

        start_bead_target = Rectangle(width=0.35, height=0.18, color=BEAD_HOT, fill_color=BEAD_HOT, fill_opacity=1, stroke_width=0)
        start_bead_target.move_to(np.array([left_far + 0.2, 0.4, 0]), aligned_edge=LEFT)
        haz_target = Rectangle(width=0.55, height=plate_h + 0.1, color=HAZ, fill_color=HAZ, fill_opacity=0.16, stroke_width=0)
        haz_target.move_to(np.array([left_far + 0.2, 0, 0]), aligned_edge=LEFT)
        self.play(Transform(bead, start_bead_target), Transform(haz, haz_target), run_time=0.5)
        self.wait(0.3)

        # Step 3 — filler fuses the pieces: bead + torch + arc + HAZ sweep left -> right
        new_caption = Text("Filler metal fuses the pieces", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 3 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        self.play(Transform(caption, new_caption), Transform(step_label, new_step), run_time=0.35)

        full_bead = Rectangle(width=right_far - left_far - 0.4, height=0.18, color=BEAD_HOT, fill_color=BEAD_HOT, fill_opacity=1, stroke_width=0)
        full_bead.move_to(np.array([left_far + 0.2, 0.4, 0]), aligned_edge=LEFT)
        full_haz = Rectangle(width=right_far - left_far - 0.4, height=plate_h + 0.1, color=HAZ, fill_color=HAZ, fill_opacity=0.16, stroke_width=0)
        full_haz.move_to(np.array([left_far + 0.2, 0, 0]), aligned_edge=LEFT)

        travel = weld_end_x - weld_start_x
        self.play(
            Transform(bead, full_bead), Transform(haz, full_haz),
            torch.animate.shift(RIGHT * travel), arc.animate.shift(RIGHT * travel),
            run_time=1.8, rate_func=linear,
        )
        self.wait(0.2)

        # Step 4 — cool & inspect
        new_caption = Text("Cool & inspect the weld", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 4 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        cool_bead = full_bead.copy().set_color(BEAD_COOL)
        self.play(
            Transform(caption, new_caption), Transform(step_label, new_step),
            Transform(bead, cool_bead),
            FadeOut(torch), FadeOut(arc),
            run_time=0.7,
        )
        check = VGroup(
            Circle(radius=0.28, color="#059669", stroke_width=2.5),
            VMobject(stroke_color="#059669", stroke_width=2.5).set_points_as_corners(
                [np.array([-0.1, 0, 0]), np.array([-0.02, -0.1, 0]), np.array([0.15, 0.12, 0])]
            ),
        ).move_to(np.array([2.6, 1.3, 0]))
        self.play(FadeIn(check, scale=0.7), run_time=0.5)
        self.wait(1.0)
