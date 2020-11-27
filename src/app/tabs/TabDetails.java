package app.tabs;

import java.text.MessageFormat;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import app.DataManager;
import javafx.collections.FXCollections;
import javafx.geometry.HPos;
import javafx.geometry.Orientation;
import javafx.geometry.Pos;
import javafx.geometry.VPos;
import javafx.scene.control.ListView;
import javafx.scene.control.ProgressBar;
import javafx.scene.control.Tab;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.VBox;
import javafx.scene.text.FontWeight;
import sf.struct.Player;
import ui.util.EntryContextMenu;
import ui.util.FX;
import ui.util.FXColor;
import ui.util.FXLabel;
import ui.util.FXStyle;
import util.Constants;
import util.Prefs;

public class TabDetails extends Tab {

	private String key;
	private List<Player> players;

	private VBox defaultRoot;

	/*
	 * Constructor
	 */
	public TabDetails() {
		this.defaultRoot = new VBox(new FXLabel("Nothing here yet :(").font(25));
		this.defaultRoot.setAlignment(Pos.CENTER);

		setText("Browse players");
		setStyle("accent_color: #FFE943; tab_text_color: #FFE943;");

		setOnSelectionChanged(E -> update());
	}

	/*
	 * Tab operations
	 */
	public String getSelectedKey() {
		return this.key;
	}

	public void clearKey() {
		this.key = null;
		this.players = null;

		update();
	}

	public void selectKey(String key) {
		this.key = key;
		this.players = DataManager.INSTANCE.getSet(key);

		update();
	}

	/*
	 * Content generation
	 */
	private void update() {
		if (Objects.isNull(this.key)) {
			setContent(this.defaultRoot);
		} else {
			createContent();
		}
	}

	private void createContent() {
		BorderPane root = new BorderPane();
		GridPane grid = new GridPane();

		ListView<String> playerList = new ListView<>();
		playerList.setItems(FXCollections.observableArrayList(players.stream().map(P -> P.Name).collect(Collectors.toList())));
		playerList.setOrientation(Orientation.VERTICAL);
		playerList.getSelectionModel().selectedIndexProperty().addListener((property, o, n) -> {
			createSecondaryContent(grid, players.get(n.intValue()));
		});
		playerList.getSelectionModel().selectFirst();

		root.setLeft(playerList);
		root.setCenter(grid);
		setContextMenu(new EntryContextMenu(key));

		setContent(root);
	}

	private void createSecondaryContent(GridPane root, Player p) {
		root.getChildren().clear();

		FX.clean(root);

		FX.pad(root, 10, 0, 0, 0, 0, 0);

		FX.col(root, HPos.CENTER, 2);
		FX.col(root, HPos.LEFT, 15);
		FX.col(root, HPos.CENTER, 8);
		FX.col(root, HPos.LEFT, 15);
		FX.col(root, HPos.CENTER, 8);
		FX.col(root, HPos.CENTER, 4);
		FX.col(root, HPos.LEFT, 15);
		FX.col(root, HPos.CENTER, 8);
		FX.col(root, HPos.LEFT, 15);
		FX.col(root, HPos.CENTER, 8);
		FX.col(root, HPos.CENTER, 2);

		FX.row(root, VPos.BOTTOM, 8);
		FX.row(root, VPos.CENTER, 6);
		FX.row(root, VPos.TOP, 6);
		FX.row(root, VPos.BOTTOM, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 1);
		FX.row(root, VPos.BOTTOM, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 1);
		FX.row(root, VPos.BOTTOM, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);
		FX.row(root, null, 5);

		root.add(new FXLabel("%s (%d)", p.Name, p.Level).font(25), 0, 0, 11, 1);

		FXLabel gearScore = new FXLabel("\u2605 %d", p.getGearScore()).font(15);
		GridPane.setHalignment(gearScore, HPos.LEFT);
		root.add(gearScore, 8, 0, 3, 1);

		root.add(new FXLabel(p.Guild).font(16), 0, 1, 11, 1);
		root.add(FX.bar(1.0 * p.XP / p.XPNext, String.format("%s out of %s XP left to next level", FX.formatl(p.XPNext - p.XP), FX.formatl(p.XPNext))), 1, 2, 9, 1);

		root.add(new FXLabel("Mount & Potions").font(15, FontWeight.BOLD), 1, 3, 4, 1);
		root.add(new FXLabel("Mount:"), 1, 4);
		root.add(new FXLabel("Potions:"), 1, 6);

		root.add(new FXLabel("Rankings").font(15, FontWeight.BOLD), 1, 10, 4, 1);
		root.add(new FXLabel("Player:"), 1, 12);
		root.add(new FXLabel("Fortress:"), 1, 13);
		root.add(new FXLabel("Rank"), 2, 11);
		root.add(new FXLabel("Honor"), 3, 11);

		if (p.GuildRole != null) {
			root.add(new FXLabel("Group").font(15, FontWeight.BOLD), 1, 15, 4, 1);
			root.add(new FXLabel("Position"), 1, 16);
			root.add(new FXLabel("Treasure"), 1, 18);
			root.add(new FXLabel("Instructor"), 1, 19);
			root.add(new FXLabel("Pet"), 3, 18);
			root.add(new FXLabel("Knights"), 3, 19);
		}

		root.add(new FXLabel("Collectibles").font(15, FontWeight.BOLD), 6, 3, 4, 1);
		root.add(new FXLabel("Scrapbook"), 6, 4);
		root.add(new FXLabel("Achievements"), 6, 5);

		root.add(new FXLabel("Attributes").font(15, FontWeight.BOLD), 6, 10, 4, 1);
		root.add(new FXLabel("Strength"), 6, 11);
		root.add(new FXLabel("Dexterity"), 6, 12);
		root.add(new FXLabel("Intelligence"), 6, 13);
		root.add(new FXLabel("Constitution"), 8, 11);
		root.add(new FXLabel("Luck"), 8, 12);
		root.add(new FXLabel("Armor"), 8, 13);

		root.add(new FXLabel("Fortress").font(15, FontWeight.BOLD), 6, 15, 4, 1);
		root.add(new FXLabel("Upgrades"), 6, 16);
		root.add(new FXLabel("Wall"), 8, 16);
		root.add(new FXLabel("Warriors"), 8, 17);
		root.add(new FXLabel("Archers"), 8, 18);
		root.add(new FXLabel("Mages"), 8, 19);

		root.add(new FXLabel(p.Mount)
				.style(FXStyle.textColor().setIf(p.GuildRole != null || Prefs.HIGHLIGHT_ALL.val() > 0).setIf(FXColor.GREEN, true).setIf(FXColor.YELLOW, p.Mount < Prefs.MOUNT1.val()).setIf(FXColor.ORANGE, p.Mount < Prefs.MOUNT0.val()).get()), 2, 4);

		int pot = 0;
		if (p.PotionDuration1 != 0) {
			root.add(new FXLabel(Constants.POTIONS[p.Potion1.intValue()]), 3, 6 + pot);
			root.add(new FXLabel(MessageFormat.format("+{0}%", p.PotionDuration1)), 2, 6 + pot);
			pot++;
		}

		if (p.PotionDuration2 != 0) {
			root.add(new FXLabel(Constants.POTIONS[p.Potion2.intValue()]), 3, 6 + pot);
			root.add(new FXLabel(MessageFormat.format("+{0}%", p.PotionDuration2)), 2, 6 + pot);
			pot++;
		}

		if (p.PotionDuration3 != 0) {
			root.add(new FXLabel(Constants.POTIONS[p.Potion3.intValue()]), 3, 6 + pot);
			root.add(new FXLabel(MessageFormat.format("+{0}%", p.PotionDuration3)), 2, 6 + pot);
			pot++;
		}

		root.add(new FXLabel(p.RankPlayer), 2, 12);
		root.add(new FXLabel(p.RankFortress), 2, 13);
		root.add(new FXLabel(p.HonorPlayer), 3, 12);
		root.add(new FXLabel(p.HonorFortress), 3, 13);

		if (p.GuildRole != null) {
			root.add(new FXLabel(Constants.GROUP_ROLES[p.GuildRole.intValue()]), 2, 16);
			root.add(new FXLabel(p.GuildTreasure), 2, 18);
			root.add(new FXLabel(p.GuildInstructor), 2, 19);
			root.add(new FXLabel(p.GuildPet).style(FXStyle.textColor().setIf(FXColor.GREEN, true).setIf(FXColor.YELLOW, p.GuildPet < Prefs.PET1.val()).setIf(FXColor.ORANGE, p.GuildPet < Prefs.PET0.val()).get()), 4, 18);
			root.add(new FXLabel(p.FortressKnights).style(FXStyle.textColor().setIf(FXColor.GREEN, true).setIf(FXColor.YELLOW, p.FortressKnights < Prefs.KNIGHTS1.val()).setIf(FXColor.ORANGE, p.FortressKnights < Prefs.KNIGHTS0.val()).get()), 4, 19);
		}

		ProgressBar bookBar = new ProgressBar(p.Book.doubleValue() / 2160D);
		bookBar.setStyle(FXStyle.accentColor().setIf(p.GuildRole != null || Prefs.HIGHLIGHT_ALL.val() > 0).setIf(FXColor.GREEN, true).setIf(FXColor.YELLOW, p.Book < Prefs.BOOK1.val()).setIf(FXColor.ORANGE, p.Book < Prefs.BOOK0.val()).get());

		FX.tip(bookBar, MessageFormat.format("{0} ({1}%) out of {2} items collected", p.Book, (int) (100D * p.Book.doubleValue() / 2160D), 2160));

		ProgressBar achievementBar = FX.bar(p.Achievements.doubleValue() / 70D, String.format("%d out of 70 achievements collected", p.Achievements));

		root.add(bookBar, 7, 4, 3, 1);
		root.add(achievementBar, 7, 5, 3, 1);

		root.add(new FXLabel(p.Strength), 7, 11);
		root.add(new FXLabel(p.Dexterity), 7, 12);
		root.add(new FXLabel(p.Intelligence), 7, 13);
		root.add(new FXLabel(p.Constitution), 9, 11);
		root.add(new FXLabel(p.Luck), 9, 12);
		root.add(new FXLabel(p.Armor), 9, 13);

		root.add(new FXLabel(p.FortressUpgrades), 7, 16);
		root.add(new FXLabel(p.FortressWall), 9, 16);
		root.add(new FXLabel(p.FortressWarriors), 9, 17);
		root.add(new FXLabel(p.FortressArchers), 9, 18);
		root.add(new FXLabel(p.FortressMages), 9, 19);
	}

}